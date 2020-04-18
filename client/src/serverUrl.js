console.log("process.env.NODE_ENV", process.env.NODE_ENV);

let BASE_URL;
let PUBLIC_URL;
if(process.env.NODE_ENV == "production") {
    BASE_URL = "https://api-cradle.herokuapp.com/api"
    PUBLIC_URL = "https://cradle-app.herokuapp.com/"
} else {
    BASE_URL = "http://localhost:5000/api"
    PUBLIC_URL = "http://localhost:3000";
}

export  { PUBLIC_URL };
export default BASE_URL;