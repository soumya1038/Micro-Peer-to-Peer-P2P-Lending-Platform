import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5500/api";

const stripeApi = axios.create({
    baseURL: API_URL + "/stripe",
});

// Add token to each request
stripeApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const createAccount = async () => {
    try {
        const response = await stripeApi.post("/create-account");
        return response.data;
    } catch (error) {
        console.error("Create Stripe account error:", error);
        throw error;
    }
};

export const getOnboardingLink = async () => {
    try {
        const response = await stripeApi.get("/onboarding-link");
        return response.data;
    } catch (error) {
        console.error("Get onboarding link error:", error);
        throw error;
    }
};

export const getAccountStatus = async () => {
    try {
        const response = await stripeApi.get("/account-status");
        return response.data;
    } catch (error) {
        console.error("Get account status error:", error);
        throw error;
    }
};