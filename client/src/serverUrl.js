console.log("process.env.NODE_ENV", process.env.NODE_ENV);

let BASE_URL;

if (process.env.BASE_URL !== undefined && process.env.BASE_URL !== null) {
    BASE_URL = process.env.BASE_URL;
}
else if(process.env.NODE_ENV == "production") {
    BASE_URL = "https://cradle-app.herokuapp.com/api"
} else {
    BASE_URL = "http://localhost:5000/api"
}

export default BASE_URL;