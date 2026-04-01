import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const productsApi = {
  async getAll() {
    const response = await axios.get(`${API_URL}/products`);
    return response.data;
  },

  async getById(id: string) {
    const response = await axios.get(`${API_URL}/products/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await axios.post(`${API_URL}/products`, data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await axios.put(`${API_URL}/products/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    const response = await axios.delete(`${API_URL}/products/${id}`);
    return response.data;
  }
};
