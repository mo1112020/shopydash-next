import { supabase } from "@/lib/supabase";
import { ParentOrder, Profile } from "@/types/database";

export interface CourierSummary {
  courier_id: string;
  total_earnings: number;
  earnings_period: number;
  delivered_count_lifetime: number;
  delivered_count_period: number;
  last_delivery_date: string | null;
  profile?: Profile; // Populated client-side
}

export interface CourierAnalytics {
  date: string;
  earnings: number;
  delivered_count: number;
}

export const deliveryAdminService = {
  // getCouriersSummary RPC
  async getCouriersSummary(startDate: Date, endDate: Date): Promise<CourierSummary[]> {
    const { data, error } = await (supabase.rpc as any)('get_couriers_summary', {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) throw error;
    return data || [];
  },

  // getCourierAnalytics RPC
  async getCourierAnalytics(courierId: string, startDate: Date, endDate: Date): Promise<CourierAnalytics[]> {
    const { data, error } = await (supabase.rpc as any)('get_courier_analytics', {
      p_courier_id: courierId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) throw error;
    return data || [];
  },

  // Settings
  async getSettings() {
    const { data, error } = await supabase
      .from('delivery_settings')
      .select('*')
      .single();
    
    // If no settings exist yet, return null or handle error
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateSettings(settings: any) {
    // Check if row exists
    const { data: existing } = await supabase.from('delivery_settings').select('id').single();
    
    if (existing) {
        const { data, error } = await supabase
        .from('delivery_settings')
        .update({ 
            ...settings, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', true) // assuming single row singleton with id=true or generic ID
        .select()
        .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
        .from('delivery_settings')
        .insert({ ...settings, id: true }) // Force ID if needed or let DB handle
        .select()
        .single();
        if (error) throw error;
        return data;
    }
  },

  // Audit: Get Parent Orders
  async getParentOrders(filters?: {
    status?: string;
    courierId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ data: ParentOrder[]; count: number }> {
    let query = supabase
      .from('parent_orders')
      .select('*', { count: 'exact' });

    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }
    if (filters?.courierId) {
      query = query.eq('delivery_user_id', filters.courierId);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    
    return { data: (data as any) || [], count: count || 0 };
  },
  
  // Assign/Unassign Courier
  async assignCourier(parentOrderId: string, courierId: string | null) {
      const { data, error } = await supabase
          .from('parent_orders')
          .update({ delivery_user_id: courierId })
          .eq('id', parentOrderId)
          .select()
          .single();
          
      if (error) throw error;
      return data;
  }
};
