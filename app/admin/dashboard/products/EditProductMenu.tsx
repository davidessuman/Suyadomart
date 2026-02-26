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
  category: string;
  subCategory: string;
  brand: string;
  gender: string;
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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<string[]>([]);
  const [colorStock, setColorStock] = useState<Record<string, string>>({});
  const [newColor, setNewColor] = useState('');
  const [selectedColorForMedia, setSelectedColorForMedia] = useState('');
  const [colorMediaModalVisible, setColorMediaModalVisible] = useState(false);
  const [colorMediaAssignments, setColorMediaAssignments] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<EditProductFormState>({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    brand: '',
    gender: '',
  });

  useEffect(() => {
    if (!visible || !product) return;

    setForm({
      title: product.title || '',
      description: product.description || '',
      category: product.category || '',
      subCategory: product.sub_category || '',
      brand: product.brand || '',
      gender: product.gender || '',
    });
    setShowCategoryDropdown(false);
    setShowSubCategoryDropdown(false);
    setMediaUrls(product.media_urls || []);
    setProductColors(product.colors_available || []);
    setColorStock(product.color_stock || {});
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

  const showDescription = Boolean(product?.description?.trim());
  const showBrand = Boolean(product?.brand?.trim());
  const showSubCategory = Boolean(product?.sub_category?.trim());
  const showGender = Boolean(product?.gender?.trim());

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

    setSaving(true);

    const normalizedColorMedia = normalizeColorMedia(colorMediaAssignments, productColors, mediaUrls);
    const normalizedColorStock = normalizeColorStock(colorStock, productColors);

    const updatePayload = {
      title: form.title.trim(),
      description: showDescription ? form.description.trim() || null : product.description,
      category: form.category.trim(),
      sub_category: showSubCategory ? form.subCategory.trim() || null : product.sub_category,
      brand: showBrand ? form.brand.trim() || null : product.brand,
      gender: showGender ? form.gender.trim() || null : product.gender,
      media_urls: mediaUrls,
      colors_available: productColors.length ? productColors : null,
      color_media: normalizedColorMedia,
      color_stock: productColors.length ? normalizedColorStock : {},
    };

    const mediaChanged = !areStringArraysEqual(product.media_urls || [], mediaUrls);
    const colorsChanged = !areStringArraysEqual(product.colors_available || [], productColors);
    const colorMediaChanged = JSON.stringify(product.color_media || {}) !== JSON.stringify(normalizedColorMedia);
    const colorStockChanged = JSON.stringify(product.color_stock || {}) !== JSON.stringify(normalizedColorStock);
    const requiresDirectUpdate = mediaChanged || colorsChanged || colorMediaChanged || colorStockChanged;

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
      updatedData = rpcV2Data as AdminDashboardProduct;
    } else if (rpcV2Error && !rpcV2Missing) {
      setSaving(false);
      if (rpcV2Error.code === '42501') {
        openStatusAlert('Update not permitted', 'Only active admins or the product owner can edit this product.', 'error');
        return;
      }
      openStatusAlert('Update failed', rpcV2Error.message || 'Could not update this product right now.', 'error');
      return;
    }

    if (!updatedData && requiresDirectUpdate && rpcV2Missing) {
      setSaving(false);
      openStatusAlert(
        'Update setup required',
        'To update product media and color assignments as admin, install PRODUCTS_ADMIN_UPDATE_MEDIA_FUNCTION.sql in Supabase SQL editor.',
        'error'
      );
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
        updatedData = rpcData as AdminDashboardProduct;
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

    if (!updatedData) {
      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', product.id)
        .select('id, seller_id, title, description, price, original_price, media_urls, color_media, color_stock, category, sub_category, gender, brand, delivery_option, quantity, sizes_available, colors_available, is_pre_order, pre_order_duration, pre_order_duration_unit, is_service, created_at')
        .single();

      if (error || !data) {
        setSaving(false);
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
                <TextInput
                  style={styles.input}
                  value={form.brand}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, brand: value }))}
                  placeholder="Brand"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.selectButton}
                activeOpacity={0.88}
                onPress={() => {
                  setShowCategoryDropdown((prev) => !prev);
                  setShowSubCategoryDropdown(false);
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
                            }));
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
                              setForm((prev) => ({ ...prev, subCategory }));
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
                <TextInput
                  style={styles.input}
                  value={form.gender}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, gender: value }))}
                  placeholder="Gender"
                  placeholderTextColor="#94A3B8"
                />
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
});

export default EditProductMenu;
