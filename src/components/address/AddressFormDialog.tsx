"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Map, Navigation, Check, Loader2 } from "lucide-react";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { addressesService, regionsService } from "@/services";
import type { AddressWithDistrict } from "@/services";
import type { Region, District } from "@/types/database";

const PRESET_LABELS = ["المنزل", "العمل", "آخر"];

interface AddressFormDialogProps {
  open: boolean;
  onClose: () => void;
  address?: AddressWithDistrict | null;
  regions: Region[];
  userId: string;
  onSave: () => Promise<void>;
  onShowMap: (regionId?: string) => void;
}

export function AddressFormDialog({
  open,
  onClose,
  address,
  regions,
  userId,
  onSave,
  onShowMap,
}: AddressFormDialogProps) {
  const [label, setLabel] = useState(address?.label || "المنزل");
  const [customLabel, setCustomLabel] = useState("");
  const [addressText, setAddressText] = useState(address?.address || "");
  const [phone, setPhone] = useState(address?.phone || "");
  const [regionId, setRegionId] = useState(address?.district?.region_id || "");
  const [districtId, setDistrictId] = useState(address?.district_id || "");
  const [isDefault, setIsDefault] = useState(address?.is_default || false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [addressError, setAddressError] = useState(false);

  // Track if location is picked (either from editing existing address with coords, or new pick)
  const isLocationPicked = !!(address?.latitude && address?.longitude);

  useEffect(() => {
    if (regionId) {
      loadDistricts(regionId);
    }
  }, [regionId]);

  useEffect(() => {
    // When address prop changes (e.g. returning from map), update fields
    if (address) {
      setLabel(address.label);
      setCustomLabel(PRESET_LABELS.includes(address.label) ? "" : address.label);
      setAddressText(address.address);
      setPhone(address.phone || "");
      
      // If address has district/region, set them. 
      // Note: If we just came back from map with ONLY coords, region might be missing in address obj if not merged properly.
      // But typically we merge it in parent.
      if (address.district?.region_id) setRegionId(address.district.region_id);
      if (address.district_id) setDistrictId(address.district_id);
      
      setIsDefault(address.is_default);
    } 
    else if (open) { 
       setLabel("المنزل");
       setCustomLabel("");
       setAddressText("");
       setPhone("");
       setRegionId("");
       setDistrictId("");
       setIsDefault(false);
    }
  }, [address, open]);

  // Reset error when dialog opens or address changes
  useEffect(() => {
    setAddressError(false);
  }, [address, open]);

  const loadDistricts = async (rid: string) => {
    try {
      const data = await regionsService.getDistricts(rid);
      setDistricts(data);
    } catch (error) {
      console.error("Failed to load districts:", error);
    }
  };

  const handleSave = async () => {
    if (!addressText.trim()) {
      notify.error("يرجى إدخال العنوان التفصيلي");
      setAddressError(true);
      return;
    }
    
    if (!regionId) {
       notify.error("يرجى اختيار المنطقة");
       return;
    }

    // Strict validation: Must have coordinates
    if (!address?.latitude || !address?.longitude) {
       notify.error("يرجى تحديد الموقع على الخريطة");
       return;
    }

    const finalLabel = label === "آخر" && customLabel ? customLabel : label;

    setIsSaving(true);
    try {
      // Prepare payload
      const payload: any = {
          label: finalLabel,
          address: addressText,
          district_id: districtId || null,
          phone: phone || null,
          is_default: isDefault,
      };
      
      // If the address object has lat/lng (from Map pick), include them
      if (address?.latitude && address?.longitude) {
         payload.latitude = address.latitude;
         payload.longitude = address.longitude;
      }
      
      // If we are editing an existing real DB address (it has an ID)
      if (address?.id) {
        await addressesService.update(address.id, userId, payload);
        notify.success("تم تحديث العنوان بنجاح");
      } else {
        await addressesService.create({
          user_id: userId,
          ...payload
        });
        notify.success("تم إضافة العنوان بنجاح");
      }
      await onSave();
    } catch (error) {
      console.error("Failed to save address:", error);
      notify.error("حدث خطأ أثناء حفظ العنوان");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {address?.id ? "تعديل العنوان" : "إضافة عنوان جديد"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
            
          {/* 1. Region Selection (Mandatory First Step) */}
          <div className="space-y-2">
            <Label>المنطقة *</Label>
            <Select
              value={regionId || "placeholder"}
              onValueChange={(val) => {
                if (val !== "placeholder") {
                  setRegionId(val);
                  setDistrictId("");
                }
              }}
              // Allow changing region even when editing, but warn user? For now allow.
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المنطقة أولاً" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  اختر المنطقة
                </SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Map Picker (Visible only after Region selected) */}
          {regionId && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-2 mb-2">
                       <Button 
                        type="button" 
                        variant={isLocationPicked ? "outline" : "default"} 
                        className="w-full" 
                        onClick={() => onShowMap(regionId)}
                        disabled={!regionId}
                      >
                        <Map className="w-4 h-4 ml-2" />
                        {address?.latitude ? "تغيير الموقع على الخريطة" : "تحديد الموقع على الخريطة"}
                      </Button>
                  </div>
                  
                  {!isLocationPicked && (
                     <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded flex items-center gap-2">
                        <Navigation className="w-4 h-4" />
                        يجب تحديد موقع التوصيل على الخريطة للمتابعة
                     </div>
                  )}

                  {isLocationPicked && address?.latitude && address?.longitude && (
                     <div className="text-xs text-muted-foreground text-center bg-muted p-2 rounded flex items-center justify-center gap-2" dir="ltr">
                        <Check className="w-3 h-3 text-green-600" />
                        Location Selected: ({address.latitude.toFixed(5)}, {address.longitude.toFixed(5)})
                     </div>
                  )}
              </div>
          )}

          {/* 3. Address Details (Locked until Location Picked) */}
          {isLocationPicked && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                    <Label>تصنيف العنوان</Label>
                    <div className="flex flex-wrap gap-2">
                    {PRESET_LABELS.map((preset) => (
                        <Button
                        key={preset}
                        type="button"
                        variant={label === preset ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLabel(preset)}
                        >
                        {preset}
                        </Button>
                    ))}
                    </div>
                </div>

                {label === "آخر" && (
                    <Input
                        placeholder="أدخل اسم للعنوان"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                    />
                )}

                <div className="space-y-2">
                    <Label className={cn(addressError && "text-destructive")}>
                    العنوان التفصيلي *
                    </Label>
                    <div className="relative">
                        <Textarea
                        placeholder="مثال: شارع النيل، بجوار مسجد السلام، عمارة 5، شقة 12"
                        value={addressText}
                        onChange={(e) => {
                            setAddressText(e.target.value);
                            if (e.target.value.trim()) setAddressError(false);
                        }}
                        className={cn("min-h-[80px]", addressError && "border-destructive focus-visible:ring-destructive")}
                        />
                    </div>
                    {addressError && (
                    <p className="text-xs text-destructive">هذا الحقل مطلوب</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>رقم الهاتف (اختياري)</Label>
                    <Input
                        type="tel"
                        dir="ltr"
                        placeholder="01xxxxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-input"
                    />
                    <span className="text-sm">تعيين كعنوان افتراضي</span>
                </label>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isLocationPicked}>
            {isSaving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            {address?.id ? "حفظ التغييرات" : "إضافة العنوان"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
