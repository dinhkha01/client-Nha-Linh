import axios from "axios";

const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/",
});

export type Staff = {
    id: number;
    name: string;
    // add other staff fields if needed
    advanceAmount?: number;
};

export type WorkLog = {
    id: number;
    staffId: number;
    date: string; // ISO date YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    durationHours: number;
};

export type MonthlySummary = {
   
    daily?: Array<{ date?: string; workDate?: string; totalHours: number }>;
  
    dailyHours?: Record<string, number>;
    
    totalHours: number;
  
    year?: number;
    month?: number; 
};

export type SalaryCalculation = {
    staffId: number;
    year: number;
    month: number;
    hourlyRate: string;
    totalHours: number;
    totalAmount: string;
};

export const StaffApi = {
    list: async (): Promise<Staff[]> => {
        const { data } = await http.get("/api/staff");
        return data;
    },
    create: async (payload: { name: string }): Promise<Staff> => {
        const { data } = await http.post("/api/staff", payload);
        return data;
    },
    updateAdvance: async (staffId: number, amount: string | number): Promise<Staff> => {
        const { data } = await http.put(`/api/staff/${staffId}/advance`, null, { params: { amount } });
        return data;
    },
    calculateSalary: async (
        staffId: number,
        year: number,
        month: number,
        hourlyRate: string
    ): Promise<SalaryCalculation> => {
        const { data } = await http.get("/api/staff/" + staffId + "/salary", {
            params: { year, month, hourlyRate },
        });
        return data;
    },
};

export const WorkLogApi = {
    listByDate: async (staffId: number, date: string): Promise<WorkLog[]> => {
        const { data } = await http.get("/api/work-logs", { params: { staffId, date } });
        return data;
    },
    create: async (payload: {
        staffId: number;
        workDate: string;
        startTime: string;
        endTime: string;
    }): Promise<WorkLog> => {
        const { data } = await http.post("/api/work-logs", payload);
        return data;
    },
};

export const DailySummaryApi = {
    getMonthly: async (
        staffId: number,
        year: number,
        month: number
    ): Promise<MonthlySummary> => {
        const { data } = await http.get("/api/daily-summaries/monthly", {
            params: { staffId, year, month },
        });
        return data;
    },
};

export const Apis = {
    staff: StaffApi,
    workLogs: WorkLogApi,
    daily: DailySummaryApi,
};