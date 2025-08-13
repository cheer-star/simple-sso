import axios from 'axios';

const api = axios.create({
  // 从环境变量中读取后端的基地址
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  // 为所有请求预设 withCredentials，以便发送 cookie
  withCredentials: true,
});

export default api;
