import api from "./api";

export interface VisitorLead {
  id?: number;
  full_name: string;
  email: string;
  college: string;
  whatsapp?: string;
  year: string;
  created_at?: string;
}

export interface DemoTimerConfig {
  active: boolean;
  title: string;
  ends_at: string;
}

export const leadsService = {
  async submitLead(payload: VisitorLead) {
    const { data } = await api.post<{ success: boolean; message: string }>("/leads/submit", payload);
    return data;
  },

  async adminGetLeads() {
    const { data } = await api.get<{ total_leads: number; leads: VisitorLead[] }>("/admin/leads");
    return data;
  },

  async adminSendPromo(payload: { subject: string; message: string; target_lead_ids?: number[] }) {
    const { data } = await api.post<{ success: boolean; sent_count: number; message: string }>("/admin/leads/send-promo", payload);
    return data;
  },

  async getDemoTimerConfig(): Promise<DemoTimerConfig> {
    const { data } = await api.get<DemoTimerConfig>("/demo-timer");
    return data;
  },

  async adminUpdateDemoTimerConfig(payload: DemoTimerConfig) {
    const { data } = await api.post<{ success: boolean; config: DemoTimerConfig }>("/admin/demo-timer", payload);
    return data;
  },
};
