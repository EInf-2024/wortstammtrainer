from http.client import responses

from click import prompt
from flask import Flask, request, jsonify, render_template
import os
from dotenv import load_dotenv
import openai
from pydantic import BaseModel
from typing import List, Dict
from db_config import get_connection

app = Flask(__name__)
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI()

class wort(BaseModel):
    wort: str
    wortart: int

#0: Nomen, 1: Verb, 2: Adjektiv, 3:Adverb

class exercise(BaseModel):
    exercise: List[wort]

class corrected_word(BaseModel):
    word: str
    correct: bool

class corrected_words_list(BaseModel):
    corrected_words: List[corrected_word]



@app.route("/")
def main():
    return render_template("index.html")



@app.route("/exercise_create", methods=["POST"])
def exercise_create():
    try:
        # Parameter abfragen
        wordlist_ids = request.args.getlist('wordlist_id', type=int)
        personal_pool = request.args.get('personal_pool', default='false').lower() == 'true'
        student_id = request.args.get('student_id', type=int)

        if not wordlist_ids:
            return jsonify({"error": 1, "message": "wordlist_id parameter is required"}), 400

        # Verbindung zur Datenbank
        cnx = get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Basis-SQL und Parameter vorbereiten
        base_query = '''
            SELECT w.word_id, w.name
            FROM `LA-wörter` w
            WHERE w.wordlist_id IN ({})
        '''.format(','.join(['%s'] * len(wordlist_ids)))
        params = wordlist_ids

        # Optional: personal_pool aktiv + student_id benötigt
        if personal_pool:
            if not student_id:
                return jsonify({"error": 1, "message": "student_id is required when personal_pool is true"}), 400

            base_query += '''
                AND EXISTS (
                    SELECT 1 FROM `LA-fortschritt` f
                    WHERE f.word_id = w.word_id AND f.student_id = %s
                )
            '''
            params.append(student_id)

        base_query += ' ORDER BY RAND() LIMIT 8'

        # Ausführen
        cursor.execute(base_query, params)
        result = cursor.fetchall()

        cursor.close()
        cnx.close()

        words = [row["name"] for row in result]

        prompt = f"""
        Klassifiziere die folgenden französischen Wörter nach ihrer Wortart:
        0 = Nomen, 1 = Verb, 2 = Adjektiv, 3 = Adverb
        Wörter: '{', '.join(words)}'
        """

        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[{"role": "system",
                       "content": "Sie sind ein hilfreicher Assistent, der strukturierte JSON-Daten generiert."},
                      {"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.7,
            response_format=exercise,
        )

        response_data = response.choices[0].message.content
        return jsonify(exercise.model_validate_json(response_data).model_dump())
    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Abrufen der Aktivitätsdetails: {str(e)}"})

@app.route("/exercise_correct")
def exercise_correct():
    try:
        completed_exercise = request.args.get("completed_exercise", "")

        prompt = f"""
        Sie kontrollieren Wortstamm Aufgaben. Kontrollieren Sie in dieser {completed_exercise} 8 mal 4 Wörter Liste welche ein Schüler ausgefüllt hat,
        ob diese 4 Wörter jeweils zum gleichen Stamm gehören, in der Reihenfolge Nomen, Verb, Adjektiv, Adverb aufgereiht sind und markieren sie diese jeweils mit True oder False.
        """

        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[{"role": "system",
                       "content": "Sie sind ein hilfreicher Assistent, der strukturierte JSON-Daten generiert."},
                      {"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3,
            response_format=corrected_words_list,
        )

        response_data = response.choices[0].message.content
        return jsonify(corrected_words_list.model_validate_json(response_data).model_dump())
    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Abrufen der Aktivitätenliste: {str(e)}"})

@app.route('/create_folder', methods=['POST'])
def create_folder():
    try:
        # Get parameters from query or form data
        parent_folder_id = request.args.get('parent_folder_id', type=int)
        name = request.args.get('name')

        if name is None:
            return jsonify({"error": 1, "message": "Parameter 'name' is required"}), 400

        # DB connection
        cnx = get_connection()
        cursor = cnx.cursor()

        # Insert query
        insert_query = '''
            INSERT INTO `LA-ordnerstruktur` (name, parent_folder_id)
            VALUES (%s, %s)
        '''
        cursor.execute(insert_query, (name, parent_folder_id))
        cnx.commit()

        cursor.close()
        cnx.close()

        return jsonify({
            "success": 1,
            "message": "Ordner erfolgreich erstellt",
        })

    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Erstellen des Ordners: {str(e)}"}), 500

@app.route('/upload_word', methods=['POST'])
def upload_word():
    try:
        # Get parameters
        wordlist_id = request.args.get('wordlist_id', type=int)
        name = request.args.get('name')

        # Validate input
        if not wordlist_id or not name:
            return jsonify({
                "error": 1,
                "message": "Parameters 'wordlist_id' and 'name' are required."
            }), 400

        # Connect to database
        cnx = get_connection()
        cursor = cnx.cursor()

        # Insert word into the table
        insert_query = '''
            INSERT INTO `LA-wörter` (name, wordlist_id)
            VALUES (%s, %s)
        '''
        cursor.execute(insert_query, (name, wordlist_id))
        cnx.commit()

        cursor.close()
        cnx.close()

        # Success response
        return jsonify({
            "success": 1,
            "message": "Wort erfolgreich hinzugefügt.",
        })

    except Exception as e:
        return jsonify({
            "error": 1,
            "message": f"Fehler beim Hochladen des Wortes: {str(e)}"
        }), 500

@app.route('/show_folders', methods=['GET'])
def show_folders():
    try:
        parentfolder_id = request.args.get('parentfolder_id', type=int)
        if parentfolder_id is None:
            return jsonify({"error": 1, "message": "Parameter 'parentfolder_id' is required"}), 400

        cnx = get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Combined SQL query
        query = '''
            (
                SELECT 
                    f.folder_id AS id,
                    f.name,
                    'folder' AS type
                FROM `LA-ordnerstruktur` f
                WHERE f.parent_folder_id = %s
            )
            UNION
            (
                SELECT 
                    w.wordlist_id AS id,
                    w.name,
                    'wordlist' AS type
                FROM `LA-wortliste` w
                WHERE w.folder_id = %s
            )
            ORDER BY name
        '''

        # Execute query
        cursor.execute(query, (parentfolder_id, parentfolder_id))
        result = cursor.fetchall()

        cursor.close()
        cnx.close()

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Abrufen der Ordnerstruktur: {str(e)}"}), 500

@app.route('/get_classes', methods=['GET'])
def get_classes():
    try:
        cnx = get_connection()
        cursor = cnx.cursor(dictionary=True)

        get_query = 'SELECT class_id, name FROM `LA-klassen` ORDER BY name'
        cursor.execute(get_query)
        result = cursor.fetchall()

        cursor.close()
        cnx.close()

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": 1,
            "message": f"Fehler beim Abrufen der Klassen: {str(e)}"
        }), 500

@app.route('/get_students', methods=['GET'])
def get_students():
    try:
        class_id = request.args.get('class_id', type=int)

        if class_id is None:
            return jsonify({"error": 1, "message": "Parameter 'class_id' is required"}), 400


        cnx = get_connection()
        cursor = cnx.cursor(dictionary=True)

        get_query = 'SELECT class_id, name FROM `LA-klassen` WHERE class_id = %s'

        cursor.execute(get_query, (class_id))
        result = cursor.fetchall()
        cursor.close()
        cnx.close()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500

#push again

if __name__ == "__main__":
    app.run(debug=True)