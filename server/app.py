from flask import Flask, request
from flask_restx import Api, Resource, fields
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, JWTManager
import datetime
from flask_cors import CORS
import db_utils

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:3000", "http://localhost:3001"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "Accept"],
    "supports_credentials": True
}})
app.config["JWT_SECRET_KEY"] = "super-secret-key"  # Change this to a real secret in production!

api = Api(
    app,
    title="Authentication API",
    version="1.0",
    description="User Authentication API using JWT",
)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Define a namespace for authentication-related routes
auth_ns = api.namespace("auth", description="User Authentication Endpoints")

# Define User Registration and Login Models for Swagger
user_model = api.model(
    "User",
    {
        "username": fields.String(required=True, description="Username of the user"),
        "email": fields.String(required=True, description="User email"),
        "password": fields.String(
            required=True, description="User password", min_length=6
        ),
    },
)

login_model = api.model(
    "Login",
    {
        "email": fields.String(required=True, description="User email"),
        "password": fields.String(
            required=True, description="User password", min_length=6
        ),
    },
)

token_response = api.model(
    "TokenResponse",
    {
        "message": fields.String(description="Login status message"),
        "token": fields.String(description="JWT Access Token"),
    },
)

error_response = api.model(
    "ErrorResponse", {"message": fields.String(description="Error message")}
)

# ============================
# Define API Endpoints
# ============================

@app.route('/', methods=['POST'])
def home():
    data = request.json
    print(data)
    return "Flask API is running!", 200



@auth_ns.route("/register", methods=['POST'])
class Register(Resource):
    @api.expect(user_model)
    @api.response(201, "User registered successfully")
    @api.response(400, "User already exists", error_response)
    def post(self):
        """Register a new user"""
        data = request.json
        username, email, password = data["username"], data["email"], data["password"]

        if db_utils.checkEmailExist(email):
            return {"message": "User already exists"}, 400

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        db_utils.addUser(username, email, hashed_password)

        return {"message": "User registered successfully"}, 201


@auth_ns.route("/login", methods=['POST'])
class Login(Resource):
    @api.expect(login_model)
    @api.response(200, "Login successful", token_response)
    @api.response(401, "Invalid credentials", error_response)
    def post(self):
        """Login user and return JWT token"""
        data = request.json
        email, password = data["email"], data["password"]

        if not db_utils.checkEmailExist(email) or not bcrypt.check_password_hash(
            db_utils.getUserHashedPassword(email), password
        ):
            return {"message": "Invalid credentials"}, 401

        access_token = create_access_token(
            identity=email, expires_delta=datetime.timedelta(hours=1)
        )
        print("reach here")
        return {"message": "Login successful", "token": access_token}, 200


# Add namespaces to API
api.add_namespace(auth_ns, path="/auth")

"""
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)  # Runs on port 8080
"""

if __name__ == "__main__":
    app.run(debug=True)
