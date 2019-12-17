console.log("process.env.NODE_ENV", process.env.NODE_ENV);

let BASE_URL;

if(process.env.NODE_ENV == "production") {
    BASE_URL = "https://api-cradle.herokuapp.com/api"
} else {
    BASE_URL = "http://localhost:5000/api"
}

export default BASE_URL