import { supabase } from '@/lib/supabase';
import type { DeliverySettings } from '@/types/delivery-settings';

class DeliverySettingsService {
  private cache: DeliverySettings | null = null;
  private cacheTime: number = 0;
  private CACHE_TTL = 60000; // Fixed 60 seconds

  async getSettings(): Promise<DeliverySettings> {
    const now = Date.now();
    
    if (this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
      return this.cache;
    }

    const { data, error } = await supabase
      .from('delivery_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Failed to load delivery settings:', error);
      throw new Error('فشل تحميل إعدادات التوصيل');
    }
    
    this.cache = data as DeliverySettings;
    this.cacheTime = now;
    return data as DeliverySettings;
  }

  async updateSettings(
    updates: Partial<Omit<DeliverySettings, 'id' | 'updated_at' | 'updated_by'>>,
    userId: string
  ): Promise<DeliverySettings> {
    const { data, error } = await supabase
      .from('delivery_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      } as any)
      .eq('id', true as any)
      .select()
      .single();

    if (error) {
      console.error('Failed to update delivery settings:', error);
      throw new Error('فشل حفظ إعدادات التوصيل');
    }
    
    // Clear cache
    this.cache = null;
    
    return data as DeliverySettings;
  }

  clearCache() {
    this.cache = null;
  }
}

export const deliverySettingsService = new DeliverySettingsService();
