
from flask import Flask, request, jsonify, render_template, g
import os
from dotenv import load_dotenv
import openai
from pydantic import BaseModel
from typing import List, Dict
import auth
from auth.auth import cursor

app = Flask(__name__)
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI()

class Wort(BaseModel):
    wort: str
    wortart: int        #0: Nomen, 1: Verb, 2: Adjektiv, 3:Adverb
    word_id: int

class Exercise(BaseModel):
    exercise: List[Wort]

class CorrectedWord(BaseModel):
    word: str
    correct: int        #0: Falsch, 1: Richtig
    word_id: int

class CorrectedWordsList(BaseModel):
    corrected_words: List[CorrectedWord]


app.route('/login', methods=['POST'])(auth.login)

@auth.route(app, "/student", required_role=["student"])
def main():
    return render_template("student.html")

@auth.route(app, "/teacher", required_role=["teacher"])
def main():
    return render_template("teacher.html")

@auth.route(app,"/create_exercise", required_role=["student"], methods=["POST"])
def exercise_create():
    try:
        # Parameter abfragen
        wordlist_ids = request.args.getlist('wordlist_id')
        personal_pool = request.args.get('personal_pool', type=int)
        student_id = g.get("user_id")

        if not wordlist_ids:
            return jsonify({"error": 1, "message": "wordlist_id parameter is required"}), 400

        # Verbindung zur Datenbank
        with auth.open() as (connection, cursor):

            if personal_pool == 0:
                base_query = '''
                    SELECT word_id, name
                    FROM `LA-wörter`
                    WHERE wordlist_id = %s
                    ORDER BY RAND() LIMIT 8
                '''
                params = wordlist_ids

                cursor.execute(base_query, (params,))
                result = cursor.fetchall()

            #personal_pool aktiv + student_id benötigt
            elif personal_pool == 1:

                query1 = '''
                    SELECT word_id
                    FROM `LA-fortschritt`
                    WHERE score < 3 AND student_id = %s 
                    ORDER BY RAND() LIMIT 8
                '''

                cursor.execute(query1, (student_id,))
                result = cursor.fetchall()

                word_ids = [(row["word_id"]) for row in result]

                query2 ='''
                    SELECT word_id, name
                    FROM `LA-wörter`
                    WHERE word_id IN ({}) AND wordlist_id IN ({})
                '''.format(
                    ','.join(['%s'] * len(word_ids)),
                    ','.join(['%s'] * len(wordlist_ids))
                )

                params = tuple(word_ids) + tuple(wordlist_ids)

                cursor.execute(query2, (word_ids,))
                result = cursor.fetchall()

            else:
                return jsonify({"error": 1, "message": "personal_pool parameter should be 0 or 1"}), 400

        words = [(row["word_id"], row["name"]) for row in result]

        prompt = f"""
        Sie erhalten französische Wörter in der Form (word_id, name)
        Klassifizieren Sie diese ihrer Wortart:
        0 = Nomen, 1 = Verb, 2 = Adjektiv, 3 = Adverb, Der word_id Eintrag muss nur in der Antwort weitergegeben werden
        Wörter: '{words}'
        """

        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[{"role": "system",
                       "content": "Sie sind ein hilfreicher Assistent, der strukturierte JSON-Daten generiert."},
                      {"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3,
            response_format=Exercise,
        )

        response_data = response.choices[0].message.parsed.exercise

        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Abrufen der Aktivitätsdetails: {str(e)}"})

@auth.route(app, "/correct_exercise", required_role=["student"])
def exercise_correct():
    try:
        completed_exercise = request.args.get("completed_exercise", "")

        prompt = f"""
        Sie erhalten 8x4 Wörter in der Form (word_id, name), kontrollieren Sie immer bei vier Wörtern mit der gleichen 
        word_id ob diese 4 Wörter jeweils zum gleichen Stamm gehören und markieren sie diese jeweils mit True oder False. 
        Wörter: {completed_exercise}
        """

        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[{"role": "system",
                       "content": "Sie sind ein hilfreicher Assistent, der strukturierte JSON-Daten generiert."},
                      {"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3,
            response_format=CorrectedWordsList,
        )

        response_data = response.choices[0].message.parsed.corrected_words

        wrong = []
        right = []

        for i in response_data:
            if i.correct == False:
                wrong.append(i.word_id)
            if i.correct == True:
                right.append(i.word_id)

        right = list(set(right) - set(wrong))

        with auth.open() as (connection, cursor):

            student_id = g.get("user_id")

            # First update
            query1 = '''
                UPDATE `LA-fortschritt`
                SET score = score + 1
                WHERE word_id IN ({}) AND student_id = %s 
            '''.format(','.join(['%s'] * len(right)))
            cursor.execute(query1, (right, student_id))

            # Second update
            query2 = '''
                UPDATE `LA-fortschritt`
                SET score = 0
                WHERE word_id IN ({}) AND student_id = %s
            '''.format(','.join(['%s'] * len(wrong)))
            cursor.execute(query2, (wrong, student_id))

        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Abrufen der Aktivitätenliste: {str(e)}"})

@auth.route(app,'/get_classes',required_role=["teacher"] , methods=['GET'])
def get_classes():
    try:
        with auth.open() as (connection, cursor):

            get_query = 'SELECT id, label FROM `mf_department` ORDER BY label'
            cursor.execute(get_query)
            result = cursor.fetchall()

        return jsonify(result)
    except Exception as e:
        return jsonify({
            "error": 1,
            "message": f"Fehler beim Abrufen der Klassen: {str(e)}"
        }), 500

@auth.route(app,'/get_students',required_role=["teacher"] , methods=['GET'])
def get_students():
    try:
        class_id = request.args.get('class_id', type=int)

        if class_id is None:
            return jsonify({"error": 1, "message": "Parameter 'class_id' is required"}), 400


        with auth.open() as (connection, cursor):

            get_query = 'SELECT id, username FROM `mf_student` WHERE department_id = %s ORDER BY username'

            cursor.execute(get_query, (class_id,))
            result = cursor.fetchall()

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500

@auth.route(app,'/get_student',required_role=["teacher"] , methods=['GET'])
def get_student():
    try:
        with auth.open() as (connection, cursor):
            student_id = g.get("user_id")

            query = '''
            SELECT wordlist_id
            FROM `LA-wörter`
            '''

            cursor.execute(query,)
            result = cursor.fetchall()

            wordlist_ids = [(row["wordlist_id"]) for row in result]

            prog = {}

            for wordlist_id in wordlist_ids:

                query = '''
                SELECT word_id
                FROM `LA-wörter`
                WHERE wordlist_id = %s
                '''

                cursor.execute(query, (wordlist_id,))
                result = cursor.fetchall()

                maxword_ids = [(row["word_id"]) for row in result]

                max = len(maxword_ids)

                query = '''
                SELECT word_id
                FROM `LA-fortschritt`
                WHERE word_id IN ({}) AND student_id = %s AND score >= 3
                '''.format(','.join(['%s'] * len(maxword_ids)))

                cursor.execute(query, (word_ids, student_id))
                result = cursor.fetchall()

                word_ids = [(row["word_id"]) for row in result]

                reached = len(word_ids)

                prog[wordlist_id] = f"{reached}/{max}"

        return jsonify(prog)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500

@auth.route(app, '/get_wordlists', required_role=["teacher", "student"] , methods=['GET'])
def get_wordlists():
    try:
        with auth.open() as (connection, cursor):

            query = '''
            SELECT wordlist_id, name
            FROM `LA-wortliste`
            '''
            cursor.execute(query)
            result = cursor.fetchall()

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500

@auth.route(app, '/create_wordlist', required_role=["teacher"] , methods=['GET'])
def create_wordlist():
    try:
        name = request.args.get('name')
        words = request.args.get('words')
        words = words.split('\n')

        with auth.open() as (connection, cursor):

            query = '''
            INSERT INTO `LA-wortliste` (name)
            VALUE %s
            '''

            cursor.execute(query, (name,))
            wordlist_id = cursor.lastrowid

            placeholders = ','.join(['(%s, %s)'] * len(words))
            params = [(word, wordlist_id) for word in words]

            query = f'INSERT INTO `LA-wörter` (name, wordlist_id) VALUES {placeholders}'

            cursor.executemany(query, params)

        return jsonify({"message":"Wörterliste erfolgreich hinzugefügt"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500

@auth.route(app, '/delete_wordlist', required_role=["teacher"] , methods=['GET'])
def delete_wordlist():
    try:
        wordlist_id = request.args.get('wordlist_id')
        with auth.open() as (connection, cursor):
            query = '''
            DELETE FROM `LA-wortliste`
            WHERE wordlist_id = %s
            '''
            cursor.execute(query, (wordlist_id,))

            query = '''
            DELETE FROM `LA-wörter`
            WHERE wordlist_id = %s
            '''
            cursor.execute(query, (wordlist_id,))
        return jsonify({"message":"Wortliste erfoglreich entfernt"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500

@auth.route(app, '/edit_wordlist', required_role=["teacher"] , methods=['GET'])
def edit_wordlist():
    try:
        wordlist_id = request.args.get('wordlist_id')
        words = request.args.get('words')
        words = words.split('\n')

        with auth.open() as (connection, cursor):

            placeholders = ','.join(['(%s, %s)'] * len(words))
            params = [(word, wordlist_id) for word in words]

            query = f'INSERT INTO `LA-wörter` (name, wordlist_id) VALUES {placeholders}'
            cursor.executemany(query, params)

        return jsonify({"message":"Wortliste erfolgreich bearbeitet"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)