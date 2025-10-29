import  Home  from "../pages/Home.js";
import { Router } from "./Router.js";

const urls = {
    "/": Home ,

}


export const routes = Router(urls);