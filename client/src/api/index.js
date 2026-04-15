import axios from "axios";

// Create central API instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export default API;
