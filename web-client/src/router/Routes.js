import  Home  from "../pages/Home.js";
import { Router } from "./Router.js";

const urls = {
    "/": Home,
    "/Chat/index.html": Home,
    "/Chat/": Home
};


export const routes = Router(urls);