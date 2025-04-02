from flask import Flask, request, jsonify, render_template
import os
from dotenv import load_dotenv
import openai

app = Flask(__name__)
load_dotenv()  # Lädt Variablen aus der .env-Datei
client = openai.OpenAI()

@app.route("/test-chatgpt")
def test_chatgpt():
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hallo, kannst du mir einen kurzen Witz erzählen?"}],
            max_tokens=50,
            temperature=0.7
        )
        # Die Antwort befindet sich in response.choices[0].message.content
        return jsonify({"error": 0, "result": response.choices[0].message.content.strip()})
    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Aufruf der OpenAI-API: {str(e)}"})

@app.route("/")
def main():
    return render_template("index.html")

@app.route("/ask-chatgpt", methods=["POST"])
def ask_chatgpt():
    data = request.get_json()
    user_input = data.get("text", "")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": user_input}],
            max_tokens=1000,
            temperature=1.1
        )
        # Die Antwort befindet sich in response.choices[0].message.content
        return jsonify({"error": 0, "result": response.choices[0].message.content.strip()})
    except Exception as e:
        return jsonify({"error": 1, "message": f"Fehler beim Aufruf der OpenAI-API: {str(e)}"})






if __name__ == "__main__":
    app.run(debug=True)