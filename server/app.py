from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity
import datetime
from flask_cors import CORS
import sys
sys.path.append('../')
import database.db_access as db_access

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

# Namespace for different routes
auth_ns = api.namespace("auth", description="User Authentication Endpoints")
resources_ns = api.namespace("resources", description="Resource Management Endpoints")
project_ns = api.namespace("projects", description="Project Access Endpoints")

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

checkout_model = api.model(
    "Checkout",
    {
        "projectID": fields.String(required=True, description="Identify project to checkout resource"),
        "hardware_set": fields.String(required=True, description="Targeted hardware set"),
        "amount": fields.Integer(required=True, description="Amount to check out"),
    }
)

checkin_model = api.model(
    "Checkin",
    {
        "token": fields.String(required=True, description="JWT Access Token"),
        "hardware_set": fields.String(required=True, description="Targeted hardware set"),
        "amount": fields.Integer(required=True, description="Amount to check in"),
    }
)

project_create_model = api.model(
    "Project creation",
    {
        "name": fields.String(required=True, description="Name of the group"),
        "des": fields.String(required=True, description="Description of the group"),
        "projectID": fields.Integer(required=True, description="Unique ID of the group"),
    }
)

get_project_model = api.model(
    "Project creation",
    {
        "token": fields.String(required=True, description="JWT Access Token"),
        "projectID": fields.Integer(required=True, description="Unique ID of the group"),
    }
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
    @api.response(400, "User or email already exists", error_response)
    def post(self):
        """Register a new user"""
        data = request.json
        username, email, password = data["username"], data["email"], data["password"]

        if db_access.checkEmailExist(email):
            return {"message": "User or email already exists"}, 400

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")  
        res = db_access.addUser(username, email, hashed_password)
        if res == 0:
            return {"message": "User registered successfully"}, 201
        else:
            return {"message": "User or email already exists"}, 400


@auth_ns.route("/login", methods=['POST'])
class Login(Resource):
    @api.expect(login_model)
    @api.response(200, "Login successful", token_response)
    @api.response(401, "Invalid credentials", error_response)
    def post(self):
        """Login user and return JWT token"""
        data = request.json
        email, password = data["email"], data["password"]

        if not db_access.checkEmailExist(email) or not bcrypt.check_password_hash(
            db_access.getUserHashedPassword(email), password
        ):
            return {"message": "Invalid credentials"}, 401

        access_token = create_access_token(
            identity=email, expires_delta=datetime.timedelta(hours=1)
        )
        return {"message": "Login successful", "token": access_token}, 200

@resources_ns.route("/", methods=['GET'])
class Resources(Resource):
    def get(self):
        return db_access.getAvailHardwares(), 200

@resources_ns.route("/checkout", methods=['POST'])
class CheckOut(Resource):
    @api.expect(checkout_model)
    @api.response(202, "Successfully check out hardwares")
    @api.response(401, "Unauthorized")
    @api.response(503, "Service Unavailable")
    @jwt_required()
    def post(self):
        """Check out hardware resources"""
        data = request.json
        projectID, hardware_set, amount = data["projectID"], data["hardware_set"], data["amount"]
        # check for jwt token validity
        email = get_jwt_identity()
        # check if hardware available
        if not db_access.checkHardwareAvail(hardware_set, amount):
            return {"message": "Insufficient hardware resources"}, 503
        
        if db_access.checkoutHardwares(projectID, hardware_set, amount):
            return {"message": f"Successfully check out {amount} from {hardware_set}"}, 202
        else:
            return {"message": "Check out failed"}, 503


@resources_ns.route("/checkin", methods=['POST'])
class CheckIn(Resource):
    @api.expect(checkout_model)
    @api.response(202, "Successfully check in hardwares")
    @api.response(401, "Unauthorized")
    @api.response(503, "Service Unavailable")
    @jwt_required()
    def post(self):
        """Check in hardware resources"""
        data = request.json
        projectID, hardware_set, amount = data["projectID"], data["hardware_set"], data["amount"]
        # check for jwt token validity
        email = get_jwt_identity()

        # check if hardware available
        if not db_access.checkAssignedHardwares(projectID, hardware_set, amount):
            return {"message": "No enough hardware to check in"}, 503

        if db_access.checkInHardwares(projectID, hardware_set, amount):
            return {"message": f"Successfully check in {amount} of {hardware_set}"}, 202
        else:
            return {"message": "Check in failed"}, 503

@project_ns.route("/create", methods=['POST'])            
class CreateProject(Resource):
    @api.expect(project_create_model)
    @api.response(200, "Project successfully created")
    @api.response(400, "Non-unique project ID")
    @api.response(400, "Unable to complete the request")
    def post(self):
        """Create a new project"""
        data = request.json
        name, des, projectID = data["name"], data["des"], data["projectID"]

        res = db_access.createProject(name, des, projectID)
        if res == -1:
            return {"message": "Non-unique project ID"}, 400
        elif res == 0:
            return {"message": "Project successfully created"}, 200
        else:
            return {"message": "Unable to complete the request"}, 400

@project_ns.route("/get_project", methods=['GET'])  
class GetProject(Resource):
    @jwt_required()
    @api.expect(get_project_model)
    @api.response(200, "Project information found and returned")
    @api.response(400, "Project not found or invalid credentials")
    def get(self):
        """Get the information of a project"""
        data = request.json
        projectID = data["projectID"]
        email = get_jwt_identity()

        res = db_access.getProject(email, projectID)
        if res == None:
            return {"message": "Invalid operations"}, 400
        else:
            return res['users'], 200
        

# Add namespaces to API
api.add_namespace(auth_ns, path="/auth")
api.add_namespace(resources_ns, path="/resources")

"""
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)  # Runs on port 8080
"""

if __name__ == "__main__":
    app.run(debug=True)
