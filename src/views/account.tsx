"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { notify } from "@/lib/notify";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Plus,
  Trash2,
  Home,
  Briefcase,
  Star,
  MoreVertical,
  Check,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AR } from "@/lib/i18n";
import { getInitials, formatPrice, cn } from "@/lib/utils";
import { useAuth } from "@/store";
import {
  addressesService,
  regionsService,
  type AddressWithDistrict,
} from "@/services";
import type { Region } from "@/types/database";
import { AddressFormDialog } from "@/components/address/AddressFormDialog";
import dynamic from "next/dynamic";
import type { GeoCoordinates } from "@/components/MapLocationPicker";

const MapLocationPicker = dynamic(
  () => import("@/components/MapLocationPicker").then((m) => m.MapLocationPicker),
  { ssr: false, loading: () => <div className="h-64 rounded-lg bg-muted animate-pulse" /> }
);

// Label icons mapping
const LABEL_ICONS: Record<string, React.ElementType> = {
  المنزل: Home,
  العمل: Briefcase,
  default: Star,
};

export default function AccountPage() {
  const { user, isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState<AddressWithDistrict[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<AddressWithDistrict | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAddresses();
      loadRegions();
    }
  }, [isAuthenticated, user?.id]);

  const loadAddresses = async () => {
    if (!user?.id) return;
    setIsLoadingAddresses(true);
    try {
      const data = await addressesService.getByUser(user.id);
      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };
  
  const loadRegions = async () => {
    try {
      const data = await regionsService.getAll();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user?.id) return;
    setDeletingId(id);
    try {
      await addressesService.delete(id, user.id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      notify.success("تم حذف العنوان بنجاح");
    } catch (error) {
      console.error("Failed to delete address:", error);
      notify.error("حدث خطأ أثناء حذف العنوان");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user?.id) return;
    try {
      await addressesService.setDefault(id, user.id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
      notify.success("تم تعيين العنوان كافتراضي");
    } catch (error) {
      console.error("Failed to set default:", error);
      notify.error("حدث خطأ");
    }
  };
  
  const handleMapLocationSelect = useCallback((coordinates: GeoCoordinates) => {
    // When returning from map, we want to open the dialog again with these coords
    
    // Construct a temporary address object with the new coordinates
    const newAddressPart = {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      label: editingAddress?.label || "المنزل",
      is_default: editingAddress?.is_default || false,
    } as AddressWithDistrict;

    setEditingAddress((prev) => ({
       ...prev, 
       ...newAddressPart,
       // Merge existing text if it was editing
       address: prev?.address ? prev.address : newAddressPart.address 
    } as AddressWithDistrict));
    
    // Re-open dialog
    setShowMapPicker(false);
    setShowAddDialog(true);
    notify.success("تم تحديد الموقع بنجاح");
  }, [editingAddress]);

  const getLabelIcon = (label: string) => {
    return LABEL_ICONS[label] || LABEL_ICONS.default;
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <User className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <Link href="/login">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container-app max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">{AR.nav.account}</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>الملف الشخصي</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowEditProfileDialog(true)}
              >
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user.full_name}</h2>
                <p className="text-muted-foreground">
                  {user.role === "SHOP_OWNER"
                    ? "صاحب متجر"
                    : user.role === "ADMIN"
                    ? "مدير"
                    : user.role === "DELIVERY"
                    ? "مندوب توصيل"
                    : "عميل"}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {AR.auth.email}
                  </p>
                  <p className="font-medium" dir="ltr">
                    {user.email}
                  </p>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {AR.auth.phone}
                    </p>
                    <p className="font-medium" dir="ltr">
                      {user.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Saved Addresses Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                العناوين المحفوظة
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                    setEditingAddress(null);
                    setShowAddDialog(true);
                }}
              >
                <Plus className="w-4 h-4" />
                إضافة عنوان
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAddresses ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  لم تقم بإضافة أي عناوين بعد
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة عنوان جديد
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => {
                  const Icon = getLabelIcon(address.label);
                  return (
                    <div
                      key={address.id}
                      className={cn(
                        "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                        address.is_default && "border-primary bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          address.is_default
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              افتراضي
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {address.address}
                        </p>
                        {address.district && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {address.district.name} -{" "}
                            {formatPrice(address.district.delivery_fee)} توصيل
                          </p>
                        )}
                        {address.phone && (
                          <p
                            className="text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {address.phone}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                                setEditingAddress(address);
                                setShowAddDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          {!address.is_default && (
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(address.id)}
                            >
                              <Check className="w-4 h-4 ml-2" />
                              تعيين كافتراضي
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteAddress(address.id)}
                            className="text-destructive focus:text-destructive"
                            disabled={deletingId === address.id}
                          >
                            {deletingId === address.id ? (
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 ml-2" />
                            )}
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/orders">
            <Card interactive className="p-6 h-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{AR.nav.orders}</h3>
                  <p className="text-sm text-muted-foreground">
                    عرض جميع طلباتك
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          {(user.role === "SHOP_OWNER" ||
            user.role === "ADMIN" ||
            user.role === "DELIVERY") && (
            <Link href="/dashboard">
              <Card interactive className="p-6 h-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {user.role === "DELIVERY"
                        ? "لوحة التوصيل"
                        : AR.dashboard.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {user.role === "DELIVERY"
                        ? "إدارة طلبات التوصيل"
                        : "إدارة متجرك"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>

        {/* Add/Edit Address Dialog (Reusable) */}
        <AddressFormDialog
          open={showAddDialog}
          onClose={() => {
            setShowAddDialog(false);
            setEditingAddress(null);
          }}
          address={editingAddress}
          regions={regions}
          userId={user.id}
          onSave={async () => {
            setShowAddDialog(false);
            setEditingAddress(null);
            await loadAddresses();
          }}
          onShowMap={(selectedRegionId) => {
            setShowAddDialog(false); // Close dialog to show map
            // Update editingAddress with the selected region so the map knows boundaries
            if (selectedRegionId) {
                const region = regions.find(r => r.id === selectedRegionId);
                if (region) {
                    setEditingAddress(prev => {
                        const base = prev || { 
                             id: "", user_id: user?.id || "", label: "المنزل", address: "", 
                             is_default: false, created_at: "", updated_at: "" 
                        } as AddressWithDistrict;
                        
                        return {
                            ...base,
                            district: { 
                                 ...(base.district || {}), 
                                 region_id: selectedRegionId,
                                 region: region
                            } as any
                        };
                    });
                }
            }
            setShowMapPicker(true);
          }}
        />

        {/* Map Picker Modal */}
        <MapLocationPicker
            open={showMapPicker}
            onClose={() => {
                setShowMapPicker(false);
                setShowAddDialog(true); // Re-open dialog on cancel
            }}
            onLocationSelect={handleMapLocationSelect}
            initialPosition={
                editingAddress?.latitude && editingAddress?.longitude 
                ? { lat: editingAddress.latitude, lng: editingAddress.longitude } 
                : undefined
            }
            // Pass the selected region's boundary
            regionBoundary={
                editingAddress?.district?.region?.boundary_coordinates || 
                regions.find(r => r.id === editingAddress?.district?.region_id)?.boundary_coordinates ||
                undefined
            }
            regionName={
                editingAddress?.district?.region?.name ||
                regions.find(r => r.id === editingAddress?.district?.region_id)?.name ||
                undefined
            }
        />

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          open={showEditProfileDialog}
          onClose={() => setShowEditProfileDialog(false)}
          user={user}
        />
      </div>
    </div>
  );
}

import { authService } from "@/services/auth.service";
import type { Profile } from "@/types/database";

function EditProfileDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: Profile;
}) {
  const { refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || "");
  const [isLoading, setIsLoading] = useState(false);

  // Update local state when user prop changes
  useEffect(() => {
    setFullName(user.full_name);
    setPhone(user.phone || "");
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      notify.error("يرجى إدخال الاسم");
      return;
    }

    setIsLoading(true);
    try {
      await authService.updateProfile(user.id, {
        full_name: fullName,
        phone: phone || null,
      });
      await refreshUser();
      notify.success("تم تحديث الملف الشخصي");
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
      notify.error("حدث خطأ أثناء التحديث");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الملف الشخصي</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>الاسم الكامل</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم الكامل"
            />
          </div>
          <div className="space-y-2">
            <Label>رقم الهاتف</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
