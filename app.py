import openai
import secrets
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager,
    login_user,
    login_required,
    logout_user,
    current_user,
    UserMixin,
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import pytz


app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:@localhost/gpt_chat"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.secret_key = secrets.token_hex(16)
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"


# User model for database
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    def is_active(self):
        return True

    def is_authenticated(self):
        return True

    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)


# Conversation model for database
class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def timestamp_ist(self):
        # Convert the UTC timestamp to IST
        return self.timestamp.astimezone(pytz.timezone("Asia/Kolkata"))


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# Your existing OpenAI API key and credentials
openai.api_key = "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"


authenticated = False


# Index route to handle authentication and redirection
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat")
@login_required
def chat():
    # Retrieve conversation history for the current user
    user_id = current_user.id
    conversation_history = Conversation.query.filter_by(user_id=user_id).all()
    return render_template(
        "chat.html",
        user_name=current_user.name,
        conversation_history=conversation_history,
    )


# Registration route for handling user registration
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        password = request.form.get("password")
        confirm_password = request.form.get("confirmPassword")

        # Check if the username or email is already taken
        existing_user = User.query.filter((User.email == email)).first()
        if existing_user:
            flash("Username or email is already taken. Please choose different ones.")
            return redirect(url_for("register"))

        # Check if passwords match
        if password != confirm_password:
            flash("Passwords do not match. Please enter matching passwords.")
            return redirect(url_for("register"))

        # Hash the password before storing it
        hashed_password = generate_password_hash(password, method="pbkdf2:sha256")

        new_user = User(name=name, email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash("Registration successful! You can now log in.")
        return redirect(url_for("register"))

    return render_template("register.html")


# Login route for handling user authentication
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        # Replace the following with actual database authentication logic
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for("chat"))
        else:
            return render_template(
                "login.html", message="Invalid credentials. Please try again."
            )

    return render_template("login.html")


# Logout route to handle user logout and redirection
@app.route("/logout", methods=["GET"])
@login_required
def logout():
    logout_user()
    return jsonify({"success": True})


# Process input route for OpenAI integration
@app.route("/process_input", methods=["POST"])
def process_input():
    user_input = request.form["user_input"]
    model = "gpt-3.5-turbo"

    response = f"You said {user_input}"

    # Use the OpenAI API to generate a response based on user input
    # response = openai.ChatCompletion.create(
    #     model=model,
    #     messages=[
    #         {
    #             "role": "system",
    #             "content": 'You are a helpful bootstrap expert who answers each and every query related to bootstrap only. Points to be remembered while solving queries. 1- If the users give you some code written with the help of bootstrap your task is to check that code if the code is correct you should appreciate it and if there are any errors then you should solve those errors and give modified version of the corrected code. 2- If users asks you to give questions that are often asked in the interview on bootstrap, then give interview questions with their answers and keep these answers short and to the point avoiding jargons and sounding like a human. Give interview questions in the intervals of 5. Like initially give 5 questions with answers and again if the users asks for more, then give next 5 and so on. 3- If the users ask you to give code examples for any topic related to bootstrap (E.g. Image Carousel, Responsive Navbar, Sidebar, Forms, Cards, Pagination, Alerts, Tables, Dropdowns, etc.), then give them proper code snippets with proper comments. For example user gives prompt “Responsive Navbar” then you should give the bootstrap code for the responsive navbar. 4- If someone ask you something other than bootstrap you’ll simply response with the message "I am a chatbot to solve bootstrap queries only! Ask me something related to bootstrap. Thank you." You will answer in simple words and in precise manner, don’t give long paragraphs over paragraphs in answer.',
    #         },
    #         {"role": "user", "content": user_input},
    #     ],
    # )["choices"][0]["message"]["content"]

    # Store the question and response in the database
    conversation = Conversation(
        question=user_input, answer=response, user_id=current_user.id
    )
    db.session.add(conversation)
    db.session.commit()

    return jsonify({"response": response})


# Route to delete chat history
@app.route("/delete_chat_history", methods=["POST"])
@login_required
def delete_chat_history():
    user_id = current_user.id
    # Delete all conversation records associated with the current user
    Conversation.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"success": True})


with app.app_context():
    db.create_all()
if __name__ == "__main__":
    app.run(debug=True)
