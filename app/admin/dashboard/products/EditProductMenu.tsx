import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { AdminDashboardProduct } from './ProductDetailsMenu';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type EditProductFormState = {
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  quantity: string;
  category: string;
  subCategory: string;
  brand: string;
  gender: string;
  deliveryOption: string;
  isPreOrder: boolean;
  preOrderDuration: string;
  preOrderDurationUnit: 'days' | 'weeks' | 'months';
  underwearType: string;
};

type EditProductMenuProps = {
  visible: boolean;
  product: AdminDashboardProduct | null;
  categoryStructure: Record<string, string[]>;
  onClose: () => void;
  onSaved: (updatedProduct: AdminDashboardProduct) => void;
  onDeleted: (deletedProductId: string) => void;
};

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    Fashion: 'shirt-outline',
    Electronics: 'phone-portrait-outline',
    Beauty: 'sparkles-outline',
    Home: 'home-outline',
    Sports: 'barbell-outline',
    Books: 'book-outline',
    Food: 'fast-food-outline',
    Glossary: 'library-outline',
    Services: 'briefcase-outline',
    Other: 'apps-outline',
  };

  return iconMap[category] || 'apps-outline';
};

const getSubCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  if (category === 'Services') return 'briefcase-outline';
  if (category === 'Electronics') return 'hardware-chip-outline';
  if (category === 'Fashion') return 'pricetag-outline';
  return 'layers-outline';
};

const getPublicMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
};

const isVideoUrl = (url?: string) => {
  const value = (url || '').toLowerCase();
  return value.includes('.mp4') || value.includes('.mov') || value.includes('.avi') || value.includes('.webm') || value.includes('.mkv');
};

const areStringArraysEqual = (left: string[] = [], right: string[] = []) => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const isFunctionMissingError = (
  error: { code?: string | null; message?: string | null } | null | undefined,
  functionName: string
) => Boolean(
  error && (
    error.code === '42883' ||
    error.message?.toLowerCase().includes(functionName.toLowerCase())
  )
);

const pickSingleRow = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] || null) : value;
};

const normalizeStockRecord = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};

  const normalized: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const parsed = String(raw ?? '').replace(/[^0-9]/g, '');
    if (parsed.length > 0) {
      normalized[key] = parsed;
    }
  });

  return normalized;
};

const normalizeColorMedia = (
  assignments: Record<string, string[]>,
  colors: string[],
  validMedia: string[]
) => {
  const validMediaSet = new Set(validMedia);
  const next: Record<string, string[]> = {};

  colors.forEach((color) => {
    const values = (assignments[color] || []).filter((url) => validMediaSet.has(url));
    if (values.length > 0) {
      next[color] = Array.from(new Set(values));
    }
  });

  return next;
};

const normalizeColorStock = (
  stock: Record<string, string>,
  colors: string[]
) => {
  const next: Record<string, string> = {};

  colors.forEach((color) => {
    const value = (stock[color] || '').replace(/[^0-9]/g, '');
    if (value.length > 0) {
      next[color] = value;
    }
  });

  return next;
};

const normalizeSizeStock = (stock: Record<string, string>, selectedSizes: string[]) => {
  const next: Record<string, string> = {};

  selectedSizes.forEach((size) => {
    const value = (stock[size] || '').replace(/[^0-9]/g, '');
    if (value.length > 0) {
      next[size] = value;
    }
  });

  return next;
};

const SIZE_OPTIONS = {
  womenDresses: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', 'UK 18'],
  womenClothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  menClothing: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  menPants: Array.from({ length: 16 }, (_, i) => `${28 + i * 2}`),
  womenPants: ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34'],
  shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'],
};

const UNDERWEAR_TYPES = ['Singlets', 'Boxers', 'Briefs', 'Panties', 'Trunks', 'Bikinis', 'Thongs', 'Brazziers', 'Other'];
const GENDER_OPTIONS = ['Men', 'Women', 'Unisex', 'Kids', 'Others'];
const ELECTRONICS_BRANDS: Record<string, string[]> = {
  Phones: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'Oppo', 'Vivo', 'Tecno', 'Infinix', 'Huawei', 'OnePlus', 'Nokia', 'Realme', 'Other'],
  Laptops: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Microsoft Surface', 'Razer', 'Alienware', 'Toshiba', 'Other'],
  Tablets: ['Apple', 'Samsung', 'Lenovo', 'Huawei', 'Amazon', 'Microsoft', 'Xiaomi', 'Other'],
  Headphones: ['Apple', 'Sony', 'Bose', 'JBL', 'Sennheiser', 'Beats', 'Anker', 'Boat', 'Skullcandy', 'Audio-Technica', 'Other'],
  Chargers: ['Anker', 'Belkin', 'Samsung', 'Apple', 'Baseus', 'UGreen', 'Spigen', 'Other'],
  Gaming: ['PlayStation', 'Xbox', 'Nintendo', 'Razer', 'Logitech', 'SteelSeries', 'Corsair', 'Other'],
  Accessories: ['Spigen', 'OtterBox', 'UAG', 'Anker', 'Baseus', 'Ringke', 'ESR', 'Other'],
  'Other Electronics': ['Other'],
};

const getAvailableSizes = (
  category: string,
  subCategory: string,
  gender: string,
  underwearType: string
): string[] => {
  if (!category || !subCategory || !gender) return [];

  const isFashion = category === 'Fashion';
  const isSports = category === 'Sports';

  if (isFashion && subCategory === 'Underwears' && underwearType) {
    if (['Boxers', 'Briefs', 'Trunks', 'Singlets'].includes(underwearType) && gender === 'Men') {
      return SIZE_OPTIONS.menClothing;
    }
    if (['Panties', 'Bikinis', 'Thongs', 'Brazziers'].includes(underwearType) && gender === 'Women') {
      return SIZE_OPTIONS.womenClothing;
    }
    if (gender === 'Unisex') {
      return Array.from(new Set([...SIZE_OPTIONS.menClothing, ...SIZE_OPTIONS.womenClothing]));
    }
    return [];
  }

  if (subCategory === 'Dresses' && gender === 'Women') return SIZE_OPTIONS.womenDresses;
  if (isFashion && ['Tops & Shirts', 'Jackets', 'Skirts'].includes(subCategory)) {
    return gender === 'Men' ? SIZE_OPTIONS.menClothing : SIZE_OPTIONS.womenClothing;
  }
  if (subCategory === 'Trousers & Jeans') return gender === 'Men' ? SIZE_OPTIONS.menPants : SIZE_OPTIONS.womenPants;
  if (isSports && ['Gym Wear', 'Jersey'].includes(subCategory)) return gender === 'Men' ? SIZE_OPTIONS.menClothing : SIZE_OPTIONS.womenClothing;
  if (subCategory === 'Footwear') return SIZE_OPTIONS.shoes;

  return [];
};

const normalizeDeliveryOption = (value: string, isService: boolean) => {
  const normalized = value.trim().toLowerCase();

  if (isService) {
    if (normalized === 'on-site' || normalized === 'remote' || normalized === 'both') return normalized;
    return 'remote';
  }

  if (normalized === 'pickup' || normalized === 'campus delivery' || normalized === 'nationwide' || normalized === 'both') {
    return normalized;
  }

  return 'campus delivery';
};

const EditProductMenu = ({ visible, product, categoryStructure, onClose, onSaved, onDeleted }: EditProductMenuProps) => {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
    onClose?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<string[]>([]);
  const [colorStock, setColorStock] = useState<Record<string, string>>({});
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeStock, setSizeStock] = useState<Record<string, string>>({});
  const [newColor, setNewColor] = useState('');
  const [selectedColorForMedia, setSelectedColorForMedia] = useState('');
  const [colorMediaModalVisible, setColorMediaModalVisible] = useState(false);
  const [colorMediaAssignments, setColorMediaAssignments] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<EditProductFormState>({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    quantity: '',
    category: '',
    subCategory: '',
    brand: '',
    gender: '',
    deliveryOption: 'campus delivery',
    isPreOrder: false,
    preOrderDuration: '',
    preOrderDurationUnit: 'days',
    underwearType: '',
  });

  useEffect(() => {
    if (!visible || !product) return;

    setForm({
      title: product.title || '',
      description: product.description || '',
      price: product.price !== null && product.price !== undefined ? String(product.price) : '',
      originalPrice: product.original_price !== null && product.original_price !== undefined ? String(product.original_price) : '',
      quantity: product.quantity !== null && product.quantity !== undefined ? String(product.quantity) : '',
      category: product.category || '',
      subCategory: product.sub_category || '',
      brand: product.brand || '',
      gender: product.gender || '',
      deliveryOption: normalizeDeliveryOption(product.delivery_option || '', product.category === 'Services'),
      isPreOrder: Boolean(product.is_pre_order),
      preOrderDuration: product.pre_order_duration ? String(product.pre_order_duration) : '',
      preOrderDurationUnit: (product.pre_order_duration_unit as 'days' | 'weeks' | 'months') || 'days',
      underwearType: product.underwear_type || '',
    });
    setShowCategoryDropdown(false);
    setShowSubCategoryDropdown(false);
    setShowBrandDropdown(false);
    setShowDeliveryDropdown(false);
    setMediaUrls(product.media_urls || []);
    setProductColors(product.colors_available || []);
    setColorStock(
      Object.fromEntries(
        Object.entries((product.color_stock as Record<string, string | number>) || {}).map(([key, value]) => [key, String(value ?? '')])
      )
    );
    setSelectedSizes(product.sizes_available || []);
    setSizeStock(
      Object.fromEntries(
        Object.entries((product.size_stock as Record<string, string | number>) || {}).map(([key, value]) => [key, String(value ?? '')])
      )
    );
    setNewColor('');
    setSelectedColorForMedia('');
    setColorMediaModalVisible(false);
    setColorMediaAssignments(product.color_media || {});
    setSaving(false);
    setDeleting(false);
    setShowDeleteConfirm(false);
    setStatusAlert({ visible: false, title: '', message: '', type: 'success' });
  }, [visible, product]);

  const openStatusAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning',
    onClose?: () => void
  ) => {
    setStatusAlert({
      visible: true,
      title,
      message,
      type,
      onClose,
    });
  };

  const categoryOptions = useMemo(() => Object.keys(categoryStructure), [categoryStructure]);
  const subCategoryOptions = useMemo(() => {
    if (!form.category) return [];
    return categoryStructure[form.category] || [];
  }, [categoryStructure, form.category]);

  const isServiceCategory = form.category === 'Services';
  const showSubCategory = subCategoryOptions.length > 0 && form.category !== 'Other';
  const showGender = (form.category === 'Fashion' || form.category === 'Sports') && !isServiceCategory;
  const showUnderwearType = form.category === 'Fashion' && form.subCategory === 'Underwears';

  const availableSizes = useMemo(
    () => getAvailableSizes(form.category, form.subCategory, form.gender, form.underwearType),
    [form.category, form.subCategory, form.gender, form.underwearType]
  );

  const requiresSizes = availableSizes.length > 0;
  const normalizedSelectedSizes = useMemo(
    () => selectedSizes.filter((size) => availableSizes.includes(size)),
    [selectedSizes, availableSizes]
  );

  const deliveryOptions = useMemo(
    () => (isServiceCategory ? ['remote', 'on-site', 'both', 'pickup'] : ['pickup', 'campus delivery', 'nationwide', 'both']),
    [isServiceCategory]
  );

  const brandOptions = useMemo(() => {
    if (form.category === 'Electronics' && form.subCategory) {
      const options = ELECTRONICS_BRANDS[form.subCategory] || [];
      if (options.length > 0) return options;
    }

    const defaults = ['No Brand', 'Other'];
    const existing = form.brand.trim();
    return existing ? Array.from(new Set([existing, ...defaults])) : defaults;
  }, [form.category, form.subCategory, form.brand]);

  useEffect(() => {
    if (!showSubCategory) {
      setForm((prev) => ({ ...prev, subCategory: '' }));
      setShowSubCategoryDropdown(false);
    } else if (form.subCategory && !subCategoryOptions.includes(form.subCategory)) {
      setForm((prev) => ({ ...prev, subCategory: '' }));
    }
  }, [showSubCategory, form.subCategory, subCategoryOptions]);

  useEffect(() => {
    if (!showGender && form.gender) {
      setForm((prev) => ({ ...prev, gender: '' }));
    }
  }, [showGender, form.gender]);

  useEffect(() => {
    if (!showUnderwearType && form.underwearType) {
      setForm((prev) => ({ ...prev, underwearType: '' }));
    }
  }, [showUnderwearType, form.underwearType]);

  useEffect(() => {
    if (!requiresSizes) {
      setSelectedSizes([]);
      setSizeStock({});
      return;
    }

    setSelectedSizes((prev) => prev.filter((size) => availableSizes.includes(size)));
    setSizeStock((prev) => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([size, value]) => {
        if (availableSizes.includes(size)) next[size] = value;
      });
      return next;
    });
  }, [requiresSizes, availableSizes]);

  const showDescription = true;
  const showBrand = true;

  const removeMedia = (index: number) => {
    setMediaUrls((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      setColorMediaAssignments((existing) => {
        const updated: Record<string, string[]> = {};
        Object.entries(existing).forEach(([color, urls]) => {
          const filtered = urls.filter((url) => next.includes(url));
          if (filtered.length > 0) {
            updated[color] = filtered;
          }
        });
        return updated;
      });
      return next;
    });
  };

  const addColor = () => {
    const value = newColor.trim();
    if (!value || productColors.includes(value)) return;
    setProductColors((prev) => [...prev, value]);
    setColorStock((prev) => ({ ...prev, [value]: prev[value] || '' }));
    setNewColor('');
  };

  const removeColor = (color: string) => {
    setProductColors((prev) => prev.filter((item) => item !== color));
    setColorStock((prev) => {
      const next = { ...prev };
      delete next[color];
      return next;
    });
    setColorMediaAssignments((prev) => {
      const next = { ...prev };
      delete next[color];
      return next;
    });
    if (selectedColorForMedia === color) {
      setColorMediaModalVisible(false);
      setSelectedColorForMedia('');
    }
  };

  const openColorMediaAssignment = (color: string) => {
    setSelectedColorForMedia(color);
    setColorMediaModalVisible(true);
  };

  const updateColorStock = (color: string, value: string) => {
    setColorStock((prev) => ({
      ...prev,
      [color]: value.replace(/[^0-9]/g, ''),
    }));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) {
        setSizeStock((current) => {
          const next = { ...current };
          delete next[size];
          return next;
        });
        return prev.filter((item) => item !== size);
      }
      return [...prev, size];
    });
  };

  const updateSizeStock = (size: string, value: string) => {
    setSizeStock((prev) => ({
      ...prev,
      [size]: value.replace(/[^0-9]/g, ''),
    }));
  };

  const handleSave = async () => {
    if (!product) return;

    if (!form.title.trim()) {
      openStatusAlert('Missing title', 'Please enter a product title.', 'warning');
      return;
    }

    if (!form.category.trim()) {
      openStatusAlert('Missing category', 'Please select a category.', 'warning');
      return;
    }

    const priceValue = Number(form.price);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      openStatusAlert('Invalid price', 'Please enter a valid selling price greater than 0.', 'warning');
      return;
    }

    const originalPriceValue = form.originalPrice.trim() ? Number(form.originalPrice) : null;
    if (form.originalPrice.trim() && (!Number.isFinite(originalPriceValue) || (originalPriceValue ?? 0) <= 0)) {
      openStatusAlert('Invalid original price', 'Original price must be a number greater than 0 when provided.', 'warning');
      return;
    }

    if (showSubCategory && !form.subCategory.trim()) {
      openStatusAlert('Missing sub category', 'Please select a sub category for this main category.', 'warning');
      return;
    }

    if (showGender && !form.gender.trim()) {
      openStatusAlert('Missing gender', 'Please choose a target gender for this product.', 'warning');
      return;
    }

    if (showUnderwearType && !form.underwearType.trim()) {
      openStatusAlert('Missing underwear type', 'Please select an underwear type.', 'warning');
      return;
    }

    if (requiresSizes && normalizedSelectedSizes.length === 0) {
      openStatusAlert('Missing sizes', 'Please select at least one size for this product.', 'warning');
      return;
    }

    const normalizedSizeStock = normalizeSizeStock(sizeStock, normalizedSelectedSizes);
    if (requiresSizes && normalizedSelectedSizes.some((size) => !normalizedSizeStock[size] || Number(normalizedSizeStock[size]) <= 0)) {
      openStatusAlert('Missing size quantities', 'Please enter a quantity greater than 0 for each selected size.', 'warning');
      return;
    }

    const normalizedColorStock = normalizeColorStock(colorStock, productColors);
    const quantityFromSizes = Object.values(normalizedSizeStock).reduce((sum, value) => sum + Number(value || 0), 0);
    const quantityFromColors = Object.values(normalizedColorStock).reduce((sum, value) => sum + Number(value || 0), 0);
    const enteredQuantity = Number(form.quantity || '0');
    const normalizedQuantity = requiresSizes
      ? quantityFromSizes
      : (productColors.length > 0 ? quantityFromColors : Math.max(0, Number.isFinite(enteredQuantity) ? enteredQuantity : 0));

    if (!isServiceCategory && !requiresSizes && productColors.length === 0 && normalizedQuantity <= 0) {
      openStatusAlert('Missing quantity', 'Please enter a quantity greater than 0.', 'warning');
      return;
    }

    if (!isServiceCategory && form.isPreOrder) {
      const duration = Number(form.preOrderDuration);
      if (!Number.isFinite(duration) || duration <= 0) {
        openStatusAlert('Invalid pre-order duration', 'Please provide a valid pre-order duration greater than 0.', 'warning');
        return;
      }
    }

    setSaving(true);

    const normalizedColorMedia = normalizeColorMedia(colorMediaAssignments, productColors, mediaUrls);
    const normalizedDeliveryOption = normalizeDeliveryOption(form.deliveryOption, isServiceCategory);

    const updatePayload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: priceValue,
      original_price: originalPriceValue,
      quantity: isServiceCategory ? 0 : normalizedQuantity,
      category: form.category.trim(),
      sub_category: showSubCategory ? form.subCategory.trim() || null : null,
      brand: form.brand.trim() || null,
      gender: showGender ? form.gender.trim() || null : null,
      media_urls: mediaUrls,
      colors_available: productColors.length ? productColors : null,
      color_media: normalizedColorMedia,
      color_stock: productColors.length ? normalizedColorStock : {},
      sizes_available: requiresSizes ? normalizedSelectedSizes : null,
      size_stock: requiresSizes ? normalizedSizeStock : null,
      delivery_option: normalizedDeliveryOption,
      is_pre_order: isServiceCategory ? false : form.isPreOrder,
      pre_order_duration: isServiceCategory || !form.isPreOrder ? null : Number(form.preOrderDuration),
      pre_order_duration_unit: isServiceCategory || !form.isPreOrder ? null : form.preOrderDurationUnit,
      is_service: isServiceCategory,
      underwear_type: showUnderwearType ? form.underwearType.trim() || null : null,
    };

    const mediaChanged = !areStringArraysEqual(product.media_urls || [], mediaUrls);
    const colorsChanged = !areStringArraysEqual(product.colors_available || [], productColors);
    const colorMediaChanged = JSON.stringify(product.color_media || {}) !== JSON.stringify(normalizedColorMedia);
    const colorStockChanged = JSON.stringify(product.color_stock || {}) !== JSON.stringify(normalizedColorStock);
    const requiresDirectUpdate = mediaChanged || colorsChanged || colorMediaChanged || colorStockChanged;

    const requiresExtendedUpdate =
      Number(product.price || 0) !== Number(updatePayload.price || 0) ||
      Number(product.original_price || 0) !== Number(updatePayload.original_price || 0) ||
      Number(product.quantity || 0) !== Number(updatePayload.quantity || 0) ||
      (product.delivery_option || '').toLowerCase() !== (updatePayload.delivery_option || '').toLowerCase() ||
      Boolean(product.is_pre_order) !== Boolean(updatePayload.is_pre_order) ||
      Number(product.pre_order_duration || 0) !== Number(updatePayload.pre_order_duration || 0) ||
      (product.pre_order_duration_unit || null) !== (updatePayload.pre_order_duration_unit || null) ||
      Boolean(product.is_service) !== Boolean(updatePayload.is_service) ||
      !areStringArraysEqual(product.sizes_available || [], updatePayload.sizes_available || []) ||
      JSON.stringify(normalizeStockRecord(product.size_stock)) !== JSON.stringify(normalizeStockRecord(updatePayload.size_stock)) ||
      (product.underwear_type || null) !== (updatePayload.underwear_type || null);

    let updatedData: AdminDashboardProduct | null = null;

    const { data: rpcV2Data, error: rpcV2Error } = await supabase.rpc('admin_update_product_v2', {
      p_product_id: product.id,
      p_title: updatePayload.title,
      p_description: updatePayload.description,
      p_category: updatePayload.category,
      p_sub_category: updatePayload.sub_category,
      p_brand: updatePayload.brand,
      p_gender: updatePayload.gender,
      p_media_urls: updatePayload.media_urls,
      p_colors_available: updatePayload.colors_available,
      p_color_media: updatePayload.color_media,
      p_color_stock: updatePayload.color_stock,
    });

    const rpcV2Missing = isFunctionMissingError(rpcV2Error, 'admin_update_product_v2');

    if (!rpcV2Error && rpcV2Data) {
      updatedData = pickSingleRow(rpcV2Data as AdminDashboardProduct | AdminDashboardProduct[]);
    } else if (rpcV2Error && !rpcV2Missing) {
      setSaving(false);
      if (rpcV2Error.code === '42501') {
        openStatusAlert('Update not permitted', 'Only active admins or the product owner can edit this product.', 'error');
        return;
      }
      openStatusAlert('Update failed', rpcV2Error.message || 'Could not update this product right now.', 'error');
      return;
    }

    if (!updatedData && !requiresDirectUpdate) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_product', {
        p_product_id: product.id,
        p_title: updatePayload.title,
        p_description: updatePayload.description,
        p_category: updatePayload.category,
        p_sub_category: updatePayload.sub_category,
        p_brand: updatePayload.brand,
        p_gender: updatePayload.gender,
      });

      if (!rpcError && rpcData) {
        updatedData = pickSingleRow(rpcData as AdminDashboardProduct | AdminDashboardProduct[]);
      } else {
        const rpcMissing = isFunctionMissingError(rpcError, 'admin_update_product');

        if (!rpcMissing) {
          setSaving(false);
          if (rpcError?.code === '42501') {
            openStatusAlert('Update not permitted', 'Only active admins or the product owner can edit this product.', 'error');
            return;
          }
          openStatusAlert('Update failed', rpcError?.message || 'Could not update this product right now.', 'error');
          return;
        }
      }
    }

    if (!updatedData || requiresDirectUpdate || requiresExtendedUpdate) {
      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', product.id)
        .select('id, seller_id, title, description, price, original_price, media_urls, color_media, color_stock, category, sub_category, gender, brand, delivery_option, quantity, sizes_available, size_stock, colors_available, is_pre_order, pre_order_duration, pre_order_duration_unit, is_service, underwear_type, created_at')
        .maybeSingle();

      if (error || !data) {
        setSaving(false);
        if (!error && !data) {
          openStatusAlert(
            'Update not applied',
            'No updated row was returned. This is usually caused by database permissions (RLS) blocking direct updates for these fields. Please install/upgrade admin update SQL functions for full-field edits.',
            'error'
          );
          return;
        }
        openStatusAlert('Update failed', error?.message || 'Could not update this product right now.', 'error');
        return;
      }

      updatedData = data as AdminDashboardProduct;
    }

    const updatedProduct: AdminDashboardProduct = {
      ...updatedData,
      display_name: product.display_name,
      avatar_url: product.avatar_url,
      university: product.university,
      shop_name: product.shop_name,
    };

    setSaving(false);
    openStatusAlert('Success', 'Product updated successfully.', 'success', () => onSaved(updatedProduct));
  };

  const handleDelete = () => {
    if (!product || deleting || saving) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!product || deleting || saving) return;

    setDeleting(true);

    const { data, error } = await supabase
      .rpc('admin_delete_product', { p_product_id: product.id });

    if (error) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      if (error.code === '23503') {
        openStatusAlert(
          'Delete blocked',
          'This product is linked to existing order records and cannot be deleted directly.',
          'error'
        );
        return;
      }

      if (error.code === '42501') {
        openStatusAlert(
          'Delete not permitted',
          'Your account is not allowed to remove products. Ensure this user is an active admin.',
          'error'
        );
        return;
      }

      openStatusAlert('Delete failed', error.message || 'Could not delete this product right now.', 'error');
      return;
    }

    if (!data || data !== product.id) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      openStatusAlert(
        'Delete not permitted',
        'No product row was deleted. Please verify the admin delete function is installed.',
        'error'
      );
      return;
    }

    setDeleting(false);
    setShowDeleteConfirm(false);
    openStatusAlert('Success', 'Product removed successfully.', 'success', () => onDeleted(product.id));
  };

  if (!visible || !product) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Product</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <View style={styles.mediaHeaderRow}>
                <Text style={styles.label}>Product Media</Text>
                <Text style={styles.mediaCountText}>{mediaUrls.length}</Text>
              </View>
              <Text style={styles.mediaHelperText}>Delete media or assign them to colors.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                {mediaUrls.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.mediaItemContainer}>
                    {isVideoUrl(url) ? (
                      <View style={[styles.mediaPreview, styles.videoPreview]}>
                        <Ionicons name="videocam" size={24} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Image source={{ uri: getPublicMediaUrl(url) }} style={styles.mediaPreview} resizeMode="cover" />
                    )}
                    {index === 0 ? (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>COVER</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity style={styles.removeMediaButton} onPress={() => removeMedia(index)}>
                      <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
                placeholder="Product title"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {showDescription ? (
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={form.description}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
                  placeholder="Product description"
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ) : null}

            {showBrand ? (
              <View style={styles.field}>
                <Text style={styles.label}>Brand</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  activeOpacity={0.88}
                  onPress={() => {
                    setShowBrandDropdown((prev) => !prev);
                    setShowCategoryDropdown(false);
                    setShowSubCategoryDropdown(false);
                    setShowDeliveryDropdown(false);
                  }}
                >
                  <View style={styles.selectButtonLeft}>
                    <Ionicons name="pricetag-outline" size={14} color="#1D4ED8" />
                    <Text numberOfLines={1} style={[styles.selectButtonText, !form.brand && styles.selectPlaceholderText]}>
                      {form.brand || 'Select brand'}
                    </Text>
                  </View>
                  <Ionicons name={showBrandDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#1D4ED8" />
                </TouchableOpacity>

                {showBrandDropdown ? (
                  <View style={styles.selectDropdown}>
                    <ScrollView style={styles.selectDropdownScroll} nestedScrollEnabled>
                      {brandOptions.map((brand) => {
                        const normalizedBrand = brand === 'No Brand' ? '' : brand;
                        const isSelected = form.brand === normalizedBrand;
                        return (
                          <TouchableOpacity
                            key={`edit-brand-${brand}`}
                            style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                            onPress={() => {
                              setForm((prev) => ({ ...prev, brand: normalizedBrand }));
                              setShowBrandDropdown(false);
                            }}
                          >
                            <View style={styles.selectOptionLeft}>
                              <Ionicons name="ellipse-outline" size={12} color={isSelected ? '#2563EB' : '#64748B'} />
                              <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>{brand}</Text>
                            </View>
                            {isSelected ? <Ionicons name="checkmark-circle" size={14} color="#2563EB" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.fieldRow}>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.label}>Price</Text>
                <TextInput
                  style={styles.input}
                  value={form.price}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, price: value.replace(/[^0-9.]/g, '') }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.label}>Original Price</Text>
                <TextInput
                  style={styles.input}
                  value={form.originalPrice}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, originalPrice: value.replace(/[^0-9.]/g, '') }))}
                  placeholder="Optional"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={form.quantity}
                onChangeText={(value) => setForm((prev) => ({ ...prev, quantity: value.replace(/[^0-9]/g, '') }))}
                placeholder={requiresSizes ? 'Auto-calculated from selected sizes' : (productColors.length ? 'Auto-calculated from color stock' : 'Enter quantity')}
                keyboardType="number-pad"
                editable={!requiresSizes && productColors.length === 0}
                placeholderTextColor="#94A3B8"
              />
              {(requiresSizes || productColors.length > 0) ? (
                <Text style={styles.helperText}>Quantity is derived automatically from {requiresSizes ? 'size quantities' : 'color quantities'}.</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.selectButton}
                activeOpacity={0.88}
                onPress={() => {
                  setShowCategoryDropdown((prev) => !prev);
                  setShowSubCategoryDropdown(false);
                  setShowBrandDropdown(false);
                  setShowDeliveryDropdown(false);
                }}
              >
                <View style={styles.selectButtonLeft}>
                  <Ionicons name="pricetag-outline" size={14} color="#1D4ED8" />
                  <Text numberOfLines={1} style={[styles.selectButtonText, !form.category && styles.selectPlaceholderText]}>
                    {form.category || 'Select category'}
                  </Text>
                </View>
                <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#1D4ED8" />
              </TouchableOpacity>

              {showCategoryDropdown ? (
                <View style={styles.selectDropdown}>
                  <ScrollView style={styles.selectDropdownScroll} nestedScrollEnabled>
                    {categoryOptions.map((category) => {
                      const isSelected = form.category === category;
                      return (
                        <TouchableOpacity
                          key={`edit-category-${category}`}
                          style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                          onPress={() => {
                            setForm((prev) => ({
                              ...prev,
                              category,
                              subCategory: prev.category === category ? prev.subCategory : '',
                              gender: prev.category === category ? prev.gender : '',
                              underwearType: prev.category === category ? prev.underwearType : '',
                              deliveryOption: normalizeDeliveryOption(prev.deliveryOption, category === 'Services'),
                              isPreOrder: category === 'Services' ? false : prev.isPreOrder,
                            }));
                            if (form.category !== category) {
                              setSelectedSizes([]);
                              setSizeStock({});
                            }
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <View style={styles.selectOptionLeft}>
                            <Ionicons name={getCategoryIcon(category)} size={14} color={isSelected ? '#2563EB' : '#64748B'} />
                            <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>{category}</Text>
                          </View>
                          {isSelected ? <Ionicons name="checkmark-circle" size={14} color="#2563EB" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            {showSubCategory ? (
              <View style={styles.field}>
                <Text style={styles.label}>Sub Category</Text>
                <TouchableOpacity
                  style={[styles.selectButton, !form.category && styles.selectButtonDisabled]}
                  activeOpacity={0.88}
                  disabled={!form.category}
                  onPress={() => {
                    setShowSubCategoryDropdown((prev) => !prev);
                    setShowCategoryDropdown(false);
                    setShowBrandDropdown(false);
                    setShowDeliveryDropdown(false);
                  }}
                >
                  <View style={styles.selectButtonLeft}>
                    <Ionicons name={getSubCategoryIcon(form.category)} size={14} color={form.category ? '#1D4ED8' : '#94A3B8'} />
                    <Text numberOfLines={1} style={[styles.selectButtonText, !form.subCategory && styles.selectPlaceholderText]}>
                      {form.subCategory || (form.category ? 'Select sub category' : 'Select category first')}
                    </Text>
                  </View>
                  <Ionicons name={showSubCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={form.category ? '#1D4ED8' : '#94A3B8'} />
                </TouchableOpacity>

                {showSubCategoryDropdown ? (
                  <View style={styles.selectDropdown}>
                    <ScrollView style={styles.selectDropdownScroll} nestedScrollEnabled>
                      {subCategoryOptions.map((subCategory) => {
                        const isSelected = form.subCategory === subCategory;
                        return (
                          <TouchableOpacity
                            key={`edit-subcategory-${subCategory}`}
                            style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                            onPress={() => {
                              setForm((prev) => ({ ...prev, subCategory, underwearType: '' }));
                              setSelectedSizes([]);
                              setSizeStock({});
                              setShowSubCategoryDropdown(false);
                            }}
                          >
                            <View style={styles.selectOptionLeft}>
                              <Ionicons name="ellipse-outline" size={12} color={isSelected ? '#2563EB' : '#64748B'} />
                              <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>{subCategory}</Text>
                            </View>
                            {isSelected ? <Ionicons name="checkmark-circle" size={14} color="#2563EB" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : null}

            {showGender ? (
              <View style={styles.field}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.chipsWrap}>
                  {GENDER_OPTIONS.map((gender) => {
                    const isSelected = form.gender === gender;
                    return (
                      <TouchableOpacity
                        key={`gender-${gender}`}
                        style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, gender }))}
                      >
                        <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>{gender}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {showUnderwearType ? (
              <View style={styles.field}>
                <Text style={styles.label}>Underwear Type</Text>
                <View style={styles.chipsWrap}>
                  {UNDERWEAR_TYPES.map((type) => {
                    const isSelected = form.underwearType === type;
                    return (
                      <TouchableOpacity
                        key={`underwear-${type}`}
                        style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, underwearType: type }))}
                      >
                        <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {requiresSizes ? (
              <View style={styles.field}>
                <Text style={styles.label}>Sizes & Quantities</Text>
                <View style={styles.chipsWrap}>
                  {availableSizes.map((size) => {
                    const isSelected = normalizedSelectedSizes.includes(size);
                    return (
                      <TouchableOpacity
                        key={`size-${size}`}
                        style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                        onPress={() => toggleSize(size)}
                      >
                        <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>{size}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {normalizedSelectedSizes.length > 0 ? (
                  <View style={styles.sizeStockList}>
                    {normalizedSelectedSizes.map((size) => (
                      <View key={`size-stock-${size}`} style={styles.sizeStockRow}>
                        <Text style={styles.sizeStockLabel}>{size}</Text>
                        <TextInput
                          style={styles.sizeStockInput}
                          keyboardType="number-pad"
                          value={sizeStock[size] || ''}
                          onChangeText={(value) => updateSizeStock(size, value)}
                          placeholder="Qty"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Delivery Option</Text>
              <TouchableOpacity
                style={styles.selectButton}
                activeOpacity={0.88}
                onPress={() => {
                  setShowDeliveryDropdown((prev) => !prev);
                  setShowBrandDropdown(false);
                  setShowCategoryDropdown(false);
                  setShowSubCategoryDropdown(false);
                }}
              >
                <View style={styles.selectButtonLeft}>
                  <Ionicons name="navigate-outline" size={14} color="#1D4ED8" />
                  <Text numberOfLines={1} style={styles.selectButtonText}>
                    {form.deliveryOption}
                  </Text>
                </View>
                <Ionicons name={showDeliveryDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#1D4ED8" />
              </TouchableOpacity>

              {showDeliveryDropdown ? (
                <View style={styles.selectDropdown}>
                  <ScrollView style={styles.selectDropdownScroll} nestedScrollEnabled>
                    {deliveryOptions.map((option) => {
                      const isSelected = form.deliveryOption === option;
                      return (
                        <TouchableOpacity
                          key={`edit-delivery-${option}`}
                          style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                          onPress={() => {
                            setForm((prev) => ({ ...prev, deliveryOption: option }));
                            setShowDeliveryDropdown(false);
                          }}
                        >
                          <View style={styles.selectOptionLeft}>
                            <Ionicons name="ellipse-outline" size={12} color={isSelected ? '#2563EB' : '#64748B'} />
                            <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>{option}</Text>
                          </View>
                          {isSelected ? <Ionicons name="checkmark-circle" size={14} color="#2563EB" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            {!isServiceCategory ? (
              <View style={styles.field}>
                <Text style={styles.label}>Pre-order</Text>
                <TouchableOpacity
                  style={[styles.toggleRow, form.isPreOrder && styles.toggleRowActive]}
                  onPress={() => setForm((prev) => ({ ...prev, isPreOrder: !prev.isPreOrder }))}
                >
                  <Ionicons name={form.isPreOrder ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={form.isPreOrder ? '#16A34A' : '#94A3B8'} />
                  <Text style={styles.toggleText}>{form.isPreOrder ? 'Enabled' : 'Disabled'}</Text>
                </TouchableOpacity>

                {form.isPreOrder ? (
                  <View style={styles.fieldRow}>
                    <View style={[styles.field, styles.fieldHalf]}>
                      <Text style={styles.label}>Duration</Text>
                      <TextInput
                        style={styles.input}
                        value={form.preOrderDuration}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, preOrderDuration: value.replace(/[^0-9]/g, '') }))}
                        keyboardType="number-pad"
                        placeholder="e.g. 3"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={[styles.field, styles.fieldHalf]}>
                      <Text style={styles.label}>Unit</Text>
                      <View style={styles.chipsWrap}>
                        {(['days', 'weeks', 'months'] as const).map((unit) => {
                          const isSelected = form.preOrderDurationUnit === unit;
                          return (
                            <TouchableOpacity
                              key={`preorder-unit-${unit}`}
                              style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                              onPress={() => setForm((prev) => ({ ...prev, preOrderDurationUnit: unit }))}
                            >
                              <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>{unit}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Colors & Media Assignment</Text>
              <View style={styles.colorInputWrap}>
                <TextInput
                  style={[styles.input, styles.colorInput]}
                  value={newColor}
                  onChangeText={setNewColor}
                  placeholder="Add color (e.g. Black)"
                  placeholderTextColor="#94A3B8"
                  onSubmitEditing={addColor}
                />
                <TouchableOpacity style={styles.addColorButton} onPress={addColor}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.colorsWrap}>
                {productColors.map((color) => {
                  const assignedCount = (colorMediaAssignments[color] || []).length;
                  return (
                    <View key={color} style={styles.colorRow}>
                      <TouchableOpacity style={styles.colorTag} onPress={() => removeColor(color)}>
                        <Text style={styles.colorTagText}>{color}</Text>
                        <Ionicons name="close" size={14} color="#64748B" />
                      </TouchableOpacity>

                      <View style={styles.colorQtyInputContainer}>
                        <TextInput
                          style={styles.colorQtyInput}
                          placeholder="Qty"
                          keyboardType="number-pad"
                          value={colorStock[color] || ''}
                          onChangeText={(value) => updateColorStock(color, value)}
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <TouchableOpacity style={styles.assignMediaButton} onPress={() => openColorMediaAssignment(color)}>
                        <Ionicons name="images" size={14} color="#FFFFFF" />
                        <Text style={styles.assignMediaButtonText}>{assignedCount > 0 ? `${assignedCount}` : 'Assign'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              {productColors.length > 0 ? (
                <Text style={styles.colorQtyHelperText}>Enter available quantity for each color.</Text>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.saveText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.deleteSection}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Remove Product</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {showDeleteConfirm ? (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmIconWrap}>
                  <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                </View>
                <Text style={styles.confirmTitle}>Confirm removal</Text>
                <Text style={styles.confirmMessage}>
                  Are you sure you want to remove this product? This action cannot be undone.
                </Text>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.confirmCancelButton}
                    onPress={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmDeleteButton}
                    onPress={confirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.confirmDeleteText}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}

          {colorMediaModalVisible && selectedColorForMedia ? (
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmCard, styles.colorMediaCard]}>
                <View style={styles.colorMediaHeader}>
                  <Text style={styles.confirmTitle}>Assign Media to {selectedColorForMedia}</Text>
                  <TouchableOpacity onPress={() => setColorMediaModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#334155" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.confirmMessage}>
                  Choose which media items should appear for this color.
                </Text>

                <ScrollView style={styles.colorMediaScroll}>
                  <View style={styles.mediaSelectionGrid}>
                    {mediaUrls.map((url, index) => {
                      const assignedMedia = colorMediaAssignments[selectedColorForMedia] || [];
                      const isAssigned = assignedMedia.includes(url);

                      return (
                        <TouchableOpacity
                          key={`${url}-${index}-assign`}
                          style={[styles.mediaSelectItem, isAssigned && styles.mediaSelectItemSelected]}
                          onPress={() => {
                            setColorMediaAssignments((prev) => {
                              const current = prev[selectedColorForMedia] || [];
                              const next = isAssigned
                                ? current.filter((value) => value !== url)
                                : [...current, url];
                              return {
                                ...prev,
                                [selectedColorForMedia]: next,
                              };
                            });
                          }}
                        >
                          {isVideoUrl(url) ? (
                            <View style={[styles.mediaSelectThumbnail, styles.videoPreview]}>
                              <Ionicons name="videocam" size={20} color="#FFFFFF" />
                            </View>
                          ) : (
                            <Image
                              source={{ uri: getPublicMediaUrl(url) }}
                              style={styles.mediaSelectThumbnail}
                              resizeMode="cover"
                            />
                          )}

                          {isAssigned ? (
                            <View style={styles.selectedCheckmark}>
                              <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmOkButton} onPress={() => setColorMediaModalVisible(false)}>
                    <Text style={styles.confirmOkText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}

          {statusAlert.visible ? (
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmCard, styles.statusCard]}>
                <View
                  style={[
                    styles.confirmIconWrap,
                    statusAlert.type === 'success'
                      ? styles.statusIconSuccess
                      : statusAlert.type === 'warning'
                        ? styles.statusIconWarning
                        : styles.statusIconError,
                  ]}
                >
                  <Ionicons
                    name={
                      statusAlert.type === 'success'
                        ? 'checkmark-circle-outline'
                        : statusAlert.type === 'warning'
                          ? 'warning-outline'
                          : 'alert-circle-outline'
                    }
                    size={20}
                    color={statusAlert.type === 'success' ? '#15803D' : statusAlert.type === 'warning' ? '#B45309' : '#DC2626'}
                  />
                </View>
                <Text style={styles.confirmTitle}>{statusAlert.title}</Text>
                <Text style={styles.confirmMessage}>{statusAlert.message}</Text>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.confirmOkButton}
                    onPress={() => {
                      const callback = statusAlert.onClose;
                      setStatusAlert({ visible: false, title: '', message: '', type: 'success' });
                      if (callback) {
                        callback();
                      }
                    }}
                  >
                    <Text style={styles.confirmOkText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  fieldHalf: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  mediaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  mediaHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -2,
  },
  mediaRow: {
    gap: 10,
    paddingVertical: 4,
  },
  mediaItemContainer: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 38, 38, 0.86)',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
  },
  inputMultiline: {
    minHeight: 96,
  },
  colorInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorInput: {
    flex: 1,
  },
  addColorButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorsWrap: {
    gap: 8,
    marginTop: 2,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorTag: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  colorTagText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  colorQtyInputContainer: {
    width: 68,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  colorQtyInput: {
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 0,
  },
  colorQtyHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  assignMediaButton: {
    minWidth: 80,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  assignMediaButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  selectButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectButtonDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  selectButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  selectPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  selectDropdown: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  selectDropdownScroll: {
    maxHeight: 190,
  },
  selectOption: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  selectOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectOptionText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  selectOptionTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  choiceChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  sizeStockList: {
    marginTop: 8,
    gap: 8,
  },
  sizeStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeStockLabel: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'center',
    paddingHorizontal: 12,
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
    paddingTop: 9,
    paddingBottom: 9,
  },
  sizeStockInput: {
    width: 84,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleRow: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleRowActive: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  toggleText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  cancelButton: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    minWidth: 136,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  deleteButton: {
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#DC2626',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
  },
  confirmIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  confirmActions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmCancelButton: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  confirmCancelText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmDeleteButton: {
    minWidth: 96,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCard: {
    borderColor: '#E2E8F0',
  },
  colorMediaCard: {
    borderColor: '#DBEAFE',
    maxHeight: '76%',
  },
  colorMediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  colorMediaScroll: {
    maxHeight: 320,
    marginTop: 8,
  },
  mediaSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 6,
  },
  mediaSelectItem: {
    width: 86,
    height: 86,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    position: 'relative',
  },
  mediaSelectItemSelected: {
    borderColor: '#2563EB',
  },
  mediaSelectThumbnail: {
    width: '100%',
    height: '100%',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  statusIconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusIconWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusIconError: {
    backgroundColor: '#FEE2E2',
  },
  confirmOkButton: {
    minWidth: 84,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  confirmOkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldMobile: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  selectDropdownMobile: {
    minWidth: '98%',
    maxWidth: '100%',
    borderRadius: 8,
    padding: 6,
  },
  scrollViewMobile: {
    paddingHorizontal: 4,
  },
});

export default EditProductMenu;
