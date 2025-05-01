from flask import Flask, request, jsonify, render_template, g
import json
import os
from dotenv import load_dotenv
import openai
from pydantic import BaseModel
from typing import List, Dict
import auth
from auth.auth import cursor

app = Flask(__name__)
load_dotenv()
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class Wort(BaseModel):
    wort: str
    wortart: int  # 0: Nomen, 1: Verb, 2: Adjektiv, 3:Adverb
    word_id: int


class Exercise(BaseModel):
    exercise: List[Wort]


class CorrectedWord(BaseModel):
    word: str
    correct: int  # 0: Falsch, 1: Richtig
    word_id: int


class CorrectedWordsList(BaseModel):
    corrected_words: List[CorrectedWord]


app.route('/login', methods=['POST'])(auth.login)  # checked


@app.route("/")
def index():
    return render_template("index.html")


@auth.route(app, "/student", required_role=["student"])
def student():
    return render_template("student/student.html")


@auth.route(app, "/teacher", required_role=["teacher"])
def teacher():
    return render_template("teacher/teacher.html")


@auth.route(app, "/create_exercise", required_role=["student"], methods=["POST"])  # checked
def create_exercise():
    try:
        # {
        # "wordlist_ids": [int, int, ...],
        # "personal_pool": int (0/1)
        # }
        # gets the data and stores it in variables
        data = request.get_json()
        wordlist_ids = data.get('wordlist_ids')
        personal_pool = data.get('personal_pool')
        student_id = g.get("user_id")

        if not wordlist_ids:
            return jsonify({"error": 1, "message": "wordlist_id parameter is required"}), 400

        with auth.open() as (connection, cursor):

            # if personal_pool is not active just select 8 words from the given wordlist
            if personal_pool == 0:
                base_query = '''
                    SELECT word_id, name
                    FROM `LA-wörter`
                    WHERE wordlist_id = %s
                    ORDER BY RAND() LIMIT 8
                '''

                cursor.execute(base_query, (wordlist_ids[0],))
                result = cursor.fetchall()

            # if personal_pool is active the selected words depend on the given wordlist(s) as well as the student and if they've mastered the words
            elif personal_pool == 1:

                # check if the student even has entries in LA-fortschritt which are not mastered
                query1 = '''
                    SELECT EXISTS (
                        SELECT 1
                        FROM `LA-fortschritt`
                        WHERE score < 3 AND student_id = %s
                    )
                '''
                cursor.execute(query1, (student_id,))
                result = cursor.fetchone()[0]

                if result == 0:
                    return jsonify({"error": 1, "message": "no words in personal_pool"}), 400

                # if there are entries in LA-fortschritt we can proceed
                elif result == 1:
                    # first select all word_ids which are not mastered (score < 3) and are saved for this student (meaning they at least used the words once)
                    query1 = '''
                        SELECT word_id
                        FROM `LA-fortschritt`
                        WHERE score < 3 AND student_id = %s
                    '''
                    cursor.execute(query1, (student_id,))
                    result = cursor.fetchall()

                    word_ids = [(row["word_id"]) for row in result] # convert the ids to a list
                    params = word_ids + wordlist_ids

                    ph1 = ','.join(['%s'] * len(word_ids))      # list of placeholders %s for the query
                    ph2 = ','.join(['%s'] * len(wordlist_ids))

                    testquery = f'''
                        SELECT EXISTS (
                            SELECT 1
                            FROM `LA-wörter`
                            WHERE word_id IN ({ph1}) AND wordlist_id IN ({ph2})
                        )
                    '''
                    cursor.execute(testquery, params)
                    result = cursor.fetchone()[0]

                    if result == 0:
                        return jsonify({"error": 1, "message": "no words in personal_pool"}), 400

                    elif result == 1:
                        # now select all the words which the student has not mastered, that also correspond to the given wordlist(s)
                        query2 = f'''
                            SELECT word_id, name
                            FROM `LA-wörter`
                            WHERE word_id IN ({ph1}) AND wordlist_id IN ({ph2})
                        '''


                        cursor.execute(query2, params)
                        result = cursor.fetchall()

            else:
                return jsonify({"error": 1, "message": "personal_pool parameter should be 0 or 1"}), 400

        words = [(row["word_id"], row["name"]) for row in result]



        prompt = f"""
        Sie erhalten französische Wörter in der Form (word_id, name)
        Klassifizieren Sie diese ihrer Wortart:
        0 = Nomen, 1 = Verb, 2 = Adjektiv, 3 = Adverb, Der word_id Eintrag muss einfach in der Antwort weitergegeben werden
        Wörter: {words}
        """

        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[{"role": "system",
                       "content": "Sie sind ein hilfreicher Assistent, der Wortarten bestimmt."},
                      {"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3,
            response_format=Exercise,
        )

        response_data = response.choices[0].message.parsed.exercise

        return jsonify([a.dict() for a in response_data])
    except Exception as e:
        return jsonify({"error": 1, "message": {str(e)}})


@auth.route(app, "/correct_exercise", required_role=["student"], methods=["POST"])
def correct_exercise():
    try:
        # {
        # "word_1": {"word_id": x, "nomen": , "verb": , "adjektiv": , "adverb":}
        # "word_2": {"word_id": x, "nomen": , "verb": , "adjektiv": , "adverb":}
        # "word_3": {"word_id": x, "nomen": , "verb": , "adjektiv": , "adverb":}
        # "word_4": {"word_id": x, "nomen": , "verb": , "adjektiv": , "adverb":}
        # ...
        # "word_8": {"word_id": x, "nomen": , "verb": , "adjektiv": , "adverb":}
        # }
        data = request.get_json()

        prompt = """
        Sie erhalten ein Dictonary von 8 Dictonarys in der Form "word_1": {"word_id": x, "nomen": , "verb": , "adjektiv": , "adverb":}, 
        kontrollieren Sie ob die 4 Wörter pro Dictonarys der deklarierten Wortart entsprechen und zum gleichen Stamm gehören.
        Übernehmen Sie den namen und die word_id und markieren Sie das Attribut correct mit 0 wenn ein Wort falsch ist und mit 1 wenn es richtig ist. 
        Wörter:
        """ + json.dumps(data, ensure_ascii=False)

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
            if i.correct == 0:
                wrong.append(i.word_id)
            if i.correct == 1:
                right.append(i.word_id)

        wrong_set = set(wrong)
        right_set = set(right)

        right = list(right_set - wrong_set)
        wrong = list(wrong_set)

        rw = right + wrong

        with auth.open() as (connection, cursor):

            student_id = g.get("user_id")

            for word_id in rw:
                testquery = '''
                    SELECT 1
                    FROM `LA-fortschritt`
                    WHERE student_id = %s AND word_id = %s
                '''

                cursor.execute(testquery, (student_id, word_id))
                result = cursor.fetchone()

                if result is None:
                    insertquery = '''
                        INSERT INTO `LA-fortschritt` (student_id, word_id, score)
                        VALUES (%s, %s, 0)
                    '''

                    params = (student_id, word_id)
                    cursor.execute(insertquery, params)

            # First update
            query1 = '''
                UPDATE `LA-fortschritt`
                SET score = score + 1
                WHERE word_id IN ({}) AND student_id = %s 
            '''.format(','.join(['%s'] * len(right)))
            cursor.execute(query1, (*right, student_id))

            # Second update
            query2 = '''
                UPDATE `LA-fortschritt`
                SET score = 0
                WHERE word_id IN ({}) AND student_id = %s
            '''.format(','.join(['%s'] * len(wrong)))
            cursor.execute(query2, (*wrong, student_id))

        return jsonify([word.dict() for word in response_data])
    except Exception as e:
        return jsonify({"error": 1, "message": {str(e)}})


@auth.route(app, '/get_classes', required_role=["teacher"], methods=['GET'])  # checked
def get_classes():
    try:
        with auth.open() as (connection, cursor):

            get_query = 'SELECT id, label FROM `mf_department` ORDER BY label'
            cursor.execute(get_query)
            result = cursor.fetchall()

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": {str(e)}}), 500


@auth.route(app, '/get_students', required_role=["teacher"], methods=['GET'])  # checked
def get_students():
    try:
        class_id = request.args.get('class_id', type=int)

        if class_id is None:
            return jsonify({"error": 1, "message": "parameter 'class_id' is required"}), 400

        with auth.open() as (connection, cursor):

            get_query = 'SELECT id, username FROM `mf_student` WHERE department_id = %s ORDER BY username'

            cursor.execute(get_query, (class_id,))
            result = cursor.fetchall()

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/get_student', required_role=["teacher"], methods=['GET'])  # checked
def get_student():
    try:
        student_id = request.args.get("id", "")

        with auth.open() as (connection, cursor):
            query = '''
                SELECT wordlist_id
                FROM `LA-wörter`
            '''

            cursor.execute(query, )
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
                    WHERE word_id IN ({}) AND id = %s AND score >= 3
                '''.format(','.join(['%s'] * len(maxword_ids)))

                cursor.execute(query, (*maxword_ids, student_id))
                result = cursor.fetchall()

                word_ids = [(row["word_id"]) for row in result]

                reached = len(word_ids)

                prog[wordlist_id] = f"{reached}/{max}"

        return jsonify(prog)
        # {
        #   "wordlist_id": "x/max",
        #   "wordlist_id": "x/max"
        # }
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/get_wordlists', required_role=["teacher", "student"], methods=['GET'])  # checked
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


@auth.route(app, '/create_wordlist', required_role=["teacher"], methods=['POST'])  # checked
def create_wordlist():
    try:
        # {
        # "name": str,
        # "words":  str
        #           str
        #           str
        #           ...
        # }
        # ein wort pro Zeile
        data = request.get_json()
        name = data.get('name')
        words = data.get('words')
        words = words.split('\n')

        with auth.open() as (connection, cursor):

            query1 = '''
                INSERT INTO `LA-wortliste` (name)
                VALUES (%s)
            '''

            cursor.execute(query1, (name,))
            wordlist_id = cursor.lastrowid

            params = [(word, wordlist_id) for word in words]

            query2 = '''
                INSERT INTO `LA-wörter` (name, wordlist_id) 
                VALUES (%s, %s)
            '''

            cursor.executemany(query2, params)

        return jsonify({"message": "wordlist successfully created"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/delete_wordlist', required_role=["teacher"], methods=['POST'])  # checked
def delete_wordlist():
    try:

        # {
        # "wordlist_id": int
        # }
        data = request.get_json()
        wordlist_id = data.get('wordlist_id')

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

        return jsonify({"message": "wordlist successfully removed"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/edit_wordlist', required_role=["teacher"], methods=['POST'])  # checked
def edit_wordlist():
    try:
        # {
        # "wordlist_id": int,
        # "words":  str
        #           str
        #           str
        # }
        # ein wort pro Zeile
        data = request.get_json()
        wordlist_id = data.get('wordlist_id')
        words = data.get('words')
        words = words.split('\n')

        with auth.open() as (connection, cursor):

            params = [(word, wordlist_id) for word in words]

            query = '''
                INSERT INTO `LA-wörter` (name, wordlist_id) 
                VALUES (%s, %s)
            '''
            cursor.executemany(query, params)

        return jsonify({"message": "wordlist successfully edited"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/reset', required_role=["student"], methods=['POST'])  # checked
def reset():
    try:
        # {
        # "wordlist_id": int
        # }
        data = request.get_json()
        wordlist_id = data.get('wordlist_id')
        student_id = g.get("user_id")

        with auth.open() as (connection, cursor):
            query1 = '''
                SELECT word_id
                FROM `LA-wörter`
                WHERE wordlist_id = %s
            '''
            cursor.execute(query1, (wordlist_id,))
            result = cursor.fetchall()

            word_ids = [(row["word_id"]) for row in result]

            params = [(word_id, student_id) for word_id in word_ids]

            query2 = '''
                UPDATE `LA-fortschritt`
                SET score = 0
                WHERE word_id = %s AND student_id = %s
            '''
            cursor.executemany(query2, params)

        return jsonify({"message": "progress successfully reset"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
