from os.path import exists
from flask import Flask, request, jsonify, render_template, g
import json
import os
from dotenv import load_dotenv
import openai
from pydantic import BaseModel
from typing import List, Dict
import auth
from auth.auth import cursor
import traceback

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


@auth.route(app, "/teacher/class.html", required_role=["teacher"])
def teacher_class():
    return render_template("teacher/class.html")


@auth.route(app, "/training.html", required_role=["student"])
def training():
    return render_template("student/training.html")


@auth.route(app, "/create_exercise", required_role=["student"], methods=["POST"])
def create_exercise():
    try:
        data = request.get_json()
        wordlist_ids = data.get('wordlist_ids')
        personal_pool = data.get('personal_pool')
        student_id = g.get("user_id")

        if not wordlist_ids:
            return jsonify({"error": 1, "message": "wordlist_id parameter is required"}), 400

        with auth.open() as (connection, cursor):
            if personal_pool == 0:
                base_query = '''
                    SELECT word_id, name
                    FROM `LA-wörter`
                    WHERE wordlist_id = %s
                    ORDER BY RAND() LIMIT 8
                '''
                cursor.execute(base_query, (wordlist_ids[0],))
                result = cursor.fetchall()

            elif personal_pool == 1:
                ph2 = ','.join(['%s'] * len(wordlist_ids))
                query = f'''
                    SELECT w.word_id, w.name
                    FROM `LA-wörter` w
                    LEFT JOIN `LA-fortschritt` f ON w.word_id = f.word_id AND f.id = %s
                    WHERE w.wordlist_id IN ({ph2})
                    AND (f.score IS NULL OR f.score < 3)
                    ORDER BY RAND() LIMIT 8
                '''
                params = [student_id] + wordlist_ids
                cursor.execute(query, params)
                result = cursor.fetchall()

                if not result:
                    return jsonify({"error": 1, "message": "no words in personal_pool"}), 400

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
        return jsonify({"error": 1, "message": str(e)})


@auth.route(app, "/correct_exercise", required_role=["student"], methods=["POST"])
def correct_exercise():
    try:
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

        # Sort results and ensure word_ids are integers
        wrong = []
        right = []
        for i in response_data:
            word_id = int(i.word_id)
            if i.correct == 0:
                wrong.append(word_id)
            if i.correct == 1:
                right.append(word_id)

        # Remove duplicates and ensure if any form is wrong, the word is marked wrong
        wrong_set = set(wrong)
        right_set = set(right)
        right = list(right_set - wrong_set)
        wrong = list(wrong_set)
        rw = right + wrong

        with auth.open() as (connection, cursor):
            student_id = g.get("user_id")

            # Check which words already exist in one query
            if rw:
                placeholders = ','.join(['%s']*len(rw))
                cursor.execute(f'''
                    SELECT word_id
                    FROM `LA-fortschritt`
                    WHERE id = %s
                    AND word_id IN ({placeholders})
                ''', (student_id, *rw))
                existing_words = {r['word_id'] for r in cursor.fetchall()}

                # Insert only new words
                new_words = [(student_id, w) for w in rw if w not in existing_words]
                if new_words:
                    cursor.executemany('''
                        INSERT INTO `LA-fortschritt` (id, word_id, score)
                        VALUES (%s, %s, 0)
                    ''', new_words)

            # Update scores for correct answers
            if right:
                placeholders = ','.join(['%s']*len(right))
                cursor.execute(f'''
                    SELECT word_id, score
                    FROM `LA-fortschritt`
                    WHERE id = %s
                    AND word_id IN ({placeholders})
                ''', (student_id, *right))
                current_scores = {row['word_id']: row['score'] for row in cursor.fetchall()}

                updates = []
                for word_id in right:
                    current_score = current_scores.get(word_id, 0)
                    new_score = current_score + 1 if current_score >= 0 else 1
                    if new_score >= 3:
                        new_score = 3
                    updates.append((new_score, student_id, word_id))

                cursor.executemany('''
                    UPDATE `LA-fortschritt`
                    SET score = %s
                    WHERE id = %s
                    AND word_id = %s
                ''', updates)

            # Reset scores for wrong answers
            if wrong:
                placeholders = ','.join(['%s']*len(wrong))
                cursor.execute(f'''
                    UPDATE `LA-fortschritt`
                    SET score = 0
                    WHERE id = %s
                    AND word_id IN ({placeholders})
                ''', (student_id, *wrong))

            connection.commit()

        return jsonify([word.dict() for word in response_data])
    except Exception as e:
        return jsonify({"error": 1, "message": str(e), "trace": traceback.format_exc()})


@auth.route(app, '/get_classes', required_role=["teacher"], methods=['GET'])
def get_classes():
    try:
        with auth.open() as (connection, cursor):
            get_query = 'SELECT id, label FROM `mf_department` ORDER BY label'
            cursor.execute(get_query)
            result = cursor.fetchall()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": {str(e)}}), 500


@auth.route(app, '/get_students', required_role=["teacher"], methods=['GET'])
def get_students():
    try:
        class_id = request.args.get('class_id', type=int)
        if class_id is None:
            return jsonify({"error": 1, "message": "parameter 'class_id' is required"}), 400

        with auth.open() as (connection, cursor):
            # First get the class name
            cursor.execute('''
                           SELECT label
                           FROM `mf_department`
                           WHERE id = %s
                           ''', (class_id,))
            class_info = cursor.fetchone()
            class_name = class_info["label"] if class_info else f"Klasse {class_id}"

            # Then get students
            get_query = '''
                        SELECT id, username
                        FROM `mf_student`
                        WHERE department_id = %s
                        ORDER BY username \
                        '''
            cursor.execute(get_query, (class_id,))
            students = cursor.fetchall()

            return jsonify({
                "class_name": class_name,
                "students": students
            })
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/get_student', required_role=["teacher"], methods=['GET'])
def get_student():
    try:
        student_id = request.args.get("id", "")

        with auth.open() as (connection, cursor):
            # Get all wordlists with their names
            cursor.execute('''
                           SELECT wl.wordlist_id, wl.name
                           FROM `LA-wortliste` wl
                           ''')
            wordlists = cursor.fetchall()

            prog = {}

            for wl in wordlists:
                wordlist_id = wl["wordlist_id"]
                wordlist_name = wl["name"]

                # Count total words in this wordlist
                cursor.execute('''
                               SELECT COUNT(*) as total
                               FROM `LA-wörter`
                               WHERE wordlist_id = %s
                               ''', (wordlist_id,))
                total = cursor.fetchone()["total"]

                # Count mastered words for this student in this wordlist
                cursor.execute('''
                               SELECT COUNT(*) as mastered
                               FROM `LA-fortschritt`
                               WHERE id = %s
                                 AND word_id IN (SELECT word_id
                                                 FROM `LA-wörter`
                                                 WHERE wordlist_id = %s)
                                 AND score >= 3
                               ''', (student_id, wordlist_id))
                mastered = cursor.fetchone()["mastered"]

                prog[wordlist_name] = f"{mastered}/{total}"

        return jsonify(prog)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/get_wordlists', required_role=["teacher", "student"], methods=['GET'])
def get_wordlists():
    try:
        with auth.open() as (connection, cursor):
            query = 'SELECT wordlist_id, name FROM `LA-wortliste`'
            cursor.execute(query)
            result = cursor.fetchall()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/create_wordlist', required_role=["teacher"], methods=['POST'])
def create_wordlist():
    try:
        data = request.get_json()
        name = data.get('name')
        words = data.get('words').split('\n')

        with auth.open() as (connection, cursor):
            query1 = 'INSERT INTO `LA-wortliste` (name) VALUES (%s)'
            cursor.execute(query1, (name,))
            wordlist_id = cursor.lastrowid

            params = [(word, wordlist_id) for word in words]
            query2 = 'INSERT INTO `LA-wörter` (name, wordlist_id) VALUES (%s, %s)'
            cursor.executemany(query2, params)
            connection.commit()

        return jsonify({"message": "wordlist successfully created"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/delete_wordlist', required_role=["teacher"], methods=['POST'])
def delete_wordlist():
    try:
        data = request.get_json()
        wordlist_id = data.get('wordlist_id')

        with auth.open() as (connection, cursor):
            query = 'DELETE FROM `LA-wörter` WHERE wordlist_id = %s'
            cursor.execute(query, (wordlist_id,))
            query = 'DELETE FROM `LA-wortliste` WHERE wordlist_id = %s'
            cursor.execute(query, (wordlist_id,))
            connection.commit()

        return jsonify({"message": "wordlist successfully removed"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/edit_wordlist', required_role=["teacher"], methods=['POST'])
def edit_wordlist():
    try:
        data = request.get_json()
        wordlist_id = data.get('wordlist_id')
        words = data.get('words').split('\n')

        with auth.open() as (connection, cursor):
            delete_query = 'DELETE FROM `LA-wörter` WHERE wordlist_id = %s'
            cursor.execute(delete_query, (wordlist_id,))

            params = [(word, wordlist_id) for word in words]
            query = 'INSERT INTO `LA-wörter` (name, wordlist_id) VALUES (%s, %s)'
            cursor.executemany(query, params)
            connection.commit()

        return jsonify({"message": "wordlist successfully edited"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/get_wordlist_words', required_role=["teacher"], methods=['GET'])
def get_wordlist_words():
    try:
        wordlist_id = request.args.get('wordlist_id', type=int)
        if not wordlist_id:
            return jsonify({"error": 1, "message": "wordlist_id is required"}), 400

        with auth.open() as (connection, cursor):
            query = '''
                SELECT name FROM `LA-wörter`
                WHERE wordlist_id = %s
                ORDER BY word_id
            '''
            cursor.execute(query, (wordlist_id,))
            result = cursor.fetchall()
            words = [row["name"] for row in result]

        return jsonify({"words": words})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/reset', required_role=["student"], methods=['POST'])
def reset():
    try:
        data = request.get_json()
        wordlist_id = data.get('wordlist_id')
        student_id = g.get("user_id")

        with auth.open() as (connection, cursor):
            query1 = 'SELECT word_id FROM `LA-wörter` WHERE wordlist_id = %s'
            cursor.execute(query1, (wordlist_id,))
            result = cursor.fetchall()
            word_ids = [(row["word_id"]) for row in result]

            params = [(word_id, student_id) for word_id in word_ids]
            query2 = '''
                UPDATE `LA-fortschritt`
                SET score = 0
                WHERE word_id = %s AND id = %s
            '''
            cursor.executemany(query2, params)
            connection.commit()

        return jsonify({"message": "progress successfully reset"})
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500


@auth.route(app, '/get_student_progress', required_role=["student"], methods=['GET'])
def get_student_progress():
    try:
        student_id = g.get("user_id")
        with auth.open() as (connection, cursor):
            cursor.execute('SELECT wordlist_id, name FROM `LA-wortliste`')
            wordlists = cursor.fetchall()

            progress = {}
            for wl in wordlists:
                wordlist_id = wl["wordlist_id"]
                cursor.execute('SELECT COUNT(*) as total FROM `LA-wörter` WHERE wordlist_id = %s', (wordlist_id,))
                total = cursor.fetchone()["total"]

                cursor.execute('''
                    SELECT COUNT(*) as mastered
                    FROM `LA-fortschritt`
                    WHERE id = %s AND word_id IN (
                        SELECT word_id FROM `LA-wörter` WHERE wordlist_id = %s
                    ) AND score >= 3
                ''', (student_id, wordlist_id))
                mastered = cursor.fetchone()["mastered"]

                cursor.execute('''
                    SELECT COUNT(*) as unmastered
                    FROM `LA-wörter`
                    WHERE wordlist_id = %s AND word_id NOT IN (
                        SELECT word_id FROM `LA-fortschritt` WHERE id = %s AND score >= 3
                    )
                ''', (wordlist_id, student_id))
                unmastered = cursor.fetchone()["unmastered"]

                progress[wordlist_id] = {
                    "total": total,
                    "mastered": mastered,
                    "unmastered": unmastered
                }
        return jsonify(progress)
    except Exception as e:
        return jsonify({"error": 1, "message": str(e)}), 500



if __name__ == "__main__":
    app.run(debug=True)