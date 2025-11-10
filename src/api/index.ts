import axios from "axios";

const http = axios.create({
    baseURL: "/",
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
    // Backend variant A (original FE expectation)
    daily?: Array<{ date?: string; workDate?: string; totalHours: number }>;
    // Backend variant B (current BE returns map)
    dailyHours?: Record<string, number>;
    // Totals
    totalHours: number;
    // Optional metadata some backends may return
    year?: number;
    month?: number; // 1-12, optional when backend returns YearMonth
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