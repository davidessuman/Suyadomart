import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

type DashboardStats = {
  totalUsers: number;
  totalSellers: number;
  totalBuyers: number;
  totalProducts: number;
  totalEvents: number;
  totalAnnouncements: number;
  totalOrders: number;
  totalCompletedOrders: number;
  totalRevenueCompleted: number;
  eventsToday: number;
  eventsThisWeek: number;
  newUsers7d: number;
  newProducts7d: number;
};

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
};

type TrendPoint = {
  label: string;
  users: number;
  products: number;
  events: number;
};

type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

type OrderStatusPoint = {
  key: 'pending' | 'processing' | 'completed' | 'cancelled';
  label: string;
  value: number;
  color: string;
};

type OrdersTrendPoint = {
  label: string;
  value: number;
};

type UniversityActivityPoint = {
  university: string;
  products: number;
  events: number;
  orders: number;
  total: number;
};

type TrendHoverState = {
  label: string;
  series: 'Users' | 'Products' | 'Events';
  value: number;
};

type DonutHoverState = {
  label: string;
  value: number;
  percent: number;
  color: string;
};

type SliceLabelPosition = {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  lineStartX: number;
  lineStartY: number;
  lineEndX: number;
  lineEndY: number;
};

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  totalSellers: 0,
  totalBuyers: 0,
  totalProducts: 0,
  totalEvents: 0,
  totalAnnouncements: 0,
  totalOrders: 0,
  totalCompletedOrders: 0,
  totalRevenueCompleted: 0,
  eventsToday: 0,
  eventsThisWeek: 0,
  newUsers7d: 0,
  newProducts7d: 0,
};

const toISODate = (value: Date) => value.toISOString().split('T')[0];

const formatShortDay = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);

const formatTimeAgo = (iso?: string | null) => {
  if (!iso) return 'just now';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'just now';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const AdminOverviewPage = () => {
  const { width } = useWindowDimensions();
  const isTinyScreen = width < 360;
  const isSmallScreen = width < 480;
  const isMobileScreen = width < 768;
  const isTabletScreen = width >= 768 && width < 1200;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentUsers, setRecentUsers] = useState<ActivityItem[]>([]);
  const [recentProducts, setRecentProducts] = useState<ActivityItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ActivityItem[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusPoint[]>([]);
  const [, setOrdersTrendData] = useState<OrdersTrendPoint[]>([]);
  const [universityActivityData, setUniversityActivityData] = useState<UniversityActivityPoint[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<TrendHoverState | null>(null);
  const [hoveredDonut, setHoveredDonut] = useState<DonutHoverState | null>(null);
  const [hoveredOrderStatus, setHoveredOrderStatus] = useState<DonutHoverState | null>(null);
  const [hoveredAudienceMix, setHoveredAudienceMix] = useState<DonutHoverState | null>(null);
  const [hoveredUniversityShare, setHoveredUniversityShare] = useState<DonutHoverState | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardWidth = useMemo(() => {
    if (width >= 1440) return '19%';
    if (width >= 1200) return '24%';
    if (width >= 900) return '32%';
    if (width >= 600) return '49%';
    return '100%';
  }, [width]);

  const contentPadding = useMemo(() => {
    if (isTinyScreen) return 8;
    if (isSmallScreen) return 10;
    if (isMobileScreen) return 14;
    if (isTabletScreen) return 18;
    return 20;
  }, [isMobileScreen, isSmallScreen, isTabletScreen, isTinyScreen]);

  const donutSize = isTinyScreen ? 160 : isSmallScreen ? 180 : 220;
  const donutCenter = donutSize / 2;
  const donutOuterRadius = isTinyScreen ? 50 : isSmallScreen ? 58 : 72;
  const donutInnerRadius = isTinyScreen ? 32 : isSmallScreen ? 38 : 48;
  const orderStatusPieSize = isTinyScreen ? 150 : isSmallScreen ? 170 : 190;
  const orderStatusPieCenter = orderStatusPieSize / 2;
  const orderStatusPieRadius = isTinyScreen ? 44 : isSmallScreen ? 50 : 58;
  const orderStatusPieInner = isTinyScreen ? 28 : isSmallScreen ? 32 : 38;
  const audiencePieSize = isTinyScreen ? 128 : isSmallScreen ? 142 : 156;
  const audiencePieCenter = audiencePieSize / 2;
  const audiencePieRadius = isTinyScreen ? 34 : isSmallScreen ? 38 : 42;
  const audiencePieInner = isTinyScreen ? 22 : isSmallScreen ? 25 : 28;
  const universitySharePieSize = isTinyScreen ? 170 : isSmallScreen ? 190 : 220;
  const universitySharePieCenter = universitySharePieSize / 2;
  const universitySharePieRadius = isTinyScreen ? 52 : isSmallScreen ? 58 : 68;
  const universitySharePieInner = isTinyScreen ? 34 : isSmallScreen ? 38 : 46;

  const loadOverview = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const todayISO = toISODate(today);
    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(weekEnd);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const [
      usersCountRes,
      sellersCountRes,
      buyersCountRes,
      productsCountRes,
      eventsCountRes,
      announcementsCountRes,
      ordersCountRes,
      completedOrdersCountRes,
      pendingOrdersCountRes,
      processingOrdersCountRes,
      cancelledOrdersCountRes,
      completedOrdersRevenueRes,
      eventsTodayCountRes,
      eventsWeekCountRes,
      newUsersCountRes,
      newProductsCountRes,
      recentUsersRes,
      recentProductsRes,
      upcomingEventsRes,
      usersTrendRes,
      productsTrendRes,
      eventsTrendRes,
      ordersTrendRes,
      universitySellersRes,
      universityProductsRes,
      universityEventsRes,
      universityOrdersRes,
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_seller', true),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_seller', false),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('announcements').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('orders').select('total_amount').eq('status', 'completed'),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('date', todayISO),
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', weekStartISO).lte('date', weekEndISO),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoISO),
      supabase.from('products').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoISO),
      supabase
        .from('user_profiles')
        .select('id, full_name, username, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('products')
        .select('id, title, created_at, price')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('events')
        .select('id, title, date, organizer')
        .gte('date', todayISO)
        .order('date', { ascending: true })
        .limit(5),
      supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', sevenDaysAgoISO),
      supabase
        .from('products')
        .select('created_at')
        .gte('created_at', sevenDaysAgoISO),
      supabase
        .from('events')
        .select('date')
        .gte('date', toISODate(sevenDaysAgo)),
      supabase
        .from('orders')
        .select('created_at')
        .gte('created_at', sevenDaysAgoISO),
      supabase
        .from('user_profiles')
        .select('id, university')
        .eq('is_seller', true)
        .limit(2000),
      supabase
        .from('products')
        .select('seller_id')
        .limit(5000),
      supabase
        .from('events')
        .select('university')
        .limit(5000),
      supabase
        .from('orders')
        .select('id, seller_id')
        .limit(5000),
    ]);

    const hasFatalError =
      usersCountRes.error ||
      sellersCountRes.error ||
      buyersCountRes.error ||
      productsCountRes.error ||
      eventsCountRes.error ||
      announcementsCountRes.error ||
      eventsTodayCountRes.error ||
      eventsWeekCountRes.error ||
      newUsersCountRes.error ||
      newProductsCountRes.error;

    if (hasFatalError) {
      setError('Unable to load overview statistics right now.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let totalOrdersValue = ordersCountRes.count ?? 0;
    let totalCompletedOrdersValue = completedOrdersCountRes.count ?? 0;
    let pendingOrdersValue = pendingOrdersCountRes.count ?? 0;
    let processingOrdersValue = processingOrdersCountRes.count ?? 0;
    let cancelledOrdersValue = cancelledOrdersCountRes.count ?? 0;
    let totalRevenueCompletedValue = (completedOrdersRevenueRes.data ?? []).reduce(
      (sum: number, row: { total_amount: number | string | null }) => sum + Number(row.total_amount || 0),
      0
    );

    const needsOrdersFallback =
      totalOrdersValue === 0 ||
      Boolean(ordersCountRes.error) ||
      Boolean(completedOrdersCountRes.error) ||
      Boolean(completedOrdersRevenueRes.error);

    if (needsOrdersFallback) {
      const { data: sellerRows, error: sellerRowsError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('is_seller', true)
        .limit(1000);

      if (!sellerRowsError && sellerRows && sellerRows.length > 0) {
        const rpcResults = await Promise.all(
          sellerRows.map(async (seller) => {
            const { data, error } = await supabase.rpc('admin_get_seller_orders', {
              p_seller_id: seller.id,
            });
            return error ? [] : (data ?? []);
          })
        );

        const orderMap = new Map<string, { status?: string; total_amount?: number | string | null }>();
        rpcResults.flat().forEach((order: any) => {
          if (!order?.id) return;
          if (!orderMap.has(order.id)) {
            orderMap.set(order.id, order);
          }
        });

        const mergedOrders = Array.from(orderMap.values());
        totalOrdersValue = mergedOrders.length;
        totalCompletedOrdersValue = mergedOrders.filter((order) => order.status === 'completed').length;
        pendingOrdersValue = mergedOrders.filter((order) => order.status === 'pending').length;
        processingOrdersValue = mergedOrders.filter((order) => order.status === 'processing').length;
        cancelledOrdersValue = mergedOrders.filter((order) => order.status === 'cancelled').length;
        totalRevenueCompletedValue = mergedOrders
          .filter((order) => order.status === 'completed')
          .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      }
    }

    setStats({
      totalUsers: usersCountRes.count ?? 0,
      totalSellers: sellersCountRes.count ?? 0,
      totalBuyers: buyersCountRes.count ?? 0,
      totalProducts: productsCountRes.count ?? 0,
      totalEvents: eventsCountRes.count ?? 0,
      totalAnnouncements: announcementsCountRes.count ?? 0,
      totalOrders: totalOrdersValue,
      totalCompletedOrders: totalCompletedOrdersValue,
      totalRevenueCompleted: totalRevenueCompletedValue,
      eventsToday: eventsTodayCountRes.count ?? 0,
      eventsThisWeek: eventsWeekCountRes.count ?? 0,
      newUsers7d: newUsersCountRes.count ?? 0,
      newProducts7d: newProductsCountRes.count ?? 0,
    });

    setOrderStatusData([
      { key: 'pending', label: 'Pending', value: pendingOrdersValue, color: '#F59E0B' },
      { key: 'processing', label: 'Processing', value: processingOrdersValue, color: '#6366F1' },
      { key: 'completed', label: 'Completed', value: totalCompletedOrdersValue, color: '#10B981' },
      { key: 'cancelled', label: 'Cancelled', value: cancelledOrdersValue, color: '#EF4444' },
    ]);

    setRecentUsers(
      (recentUsersRes.data ?? []).map((user: any) => ({
        id: user.id,
        title: user.full_name?.trim() || user.username || 'New user',
        meta: `Joined ${formatTimeAgo(user.created_at)}`,
      }))
    );

    setRecentProducts(
      (recentProductsRes.data ?? []).map((product: any) => ({
        id: product.id,
        title: product.title || 'Untitled product',
        meta: `Added ${formatTimeAgo(product.created_at)} • GH₵${Number(product.price || 0).toFixed(2)}`,
      }))
    );

    setUpcomingEvents(
      (upcomingEventsRes.data ?? []).map((event: any) => ({
        id: event.id,
        title: event.title || 'Untitled event',
        meta: `${event.date || 'No date'}${event.organizer ? ` • ${event.organizer}` : ''}`,
      }))
    );

    const labels: string[] = [];
    const dateKeys: string[] = [];
    for (let index = 6; index >= 0; index -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - index);
      day.setHours(0, 0, 0, 0);
      labels.push(formatShortDay(day));
      dateKeys.push(toISODate(day));
    }

    const usersByDay = new Map<string, number>(dateKeys.map((key) => [key, 0]));
    const productsByDay = new Map<string, number>(dateKeys.map((key) => [key, 0]));
    const eventsByDay = new Map<string, number>(dateKeys.map((key) => [key, 0]));

    (usersTrendRes.data ?? []).forEach((row: any) => {
      if (!row?.created_at) return;
      const key = toISODate(new Date(row.created_at));
      if (usersByDay.has(key)) usersByDay.set(key, (usersByDay.get(key) ?? 0) + 1);
    });

    (productsTrendRes.data ?? []).forEach((row: any) => {
      if (!row?.created_at) return;
      const key = toISODate(new Date(row.created_at));
      if (productsByDay.has(key)) productsByDay.set(key, (productsByDay.get(key) ?? 0) + 1);
    });

    (eventsTrendRes.data ?? []).forEach((row: any) => {
      if (!row?.date) return;
      const key = String(row.date);
      if (eventsByDay.has(key)) eventsByDay.set(key, (eventsByDay.get(key) ?? 0) + 1);
    });

    setTrendData(
      dateKeys.map((key, idx) => ({
        label: labels[idx],
        users: usersByDay.get(key) ?? 0,
        products: productsByDay.get(key) ?? 0,
        events: eventsByDay.get(key) ?? 0,
      }))
    );

    const ordersByDay = new Map<string, number>(dateKeys.map((key) => [key, 0]));
    const directOrdersTrendRows = ordersTrendRes.data ?? [];
    directOrdersTrendRows.forEach((row: { created_at?: string | null }) => {
      if (!row?.created_at) return;
      const key = toISODate(new Date(row.created_at));
      if (ordersByDay.has(key)) ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
    });

    const directOrdersTrendTotal = directOrdersTrendRows.length;
    const hasOrderMetricsFromFallback = totalOrdersValue > 0 && (ordersCountRes.count ?? 0) === 0;

    if (hasOrderMetricsFromFallback && directOrdersTrendTotal === 0) {
      const { data: sellerRows, error: sellerRowsError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('is_seller', true)
        .limit(1000);

      if (!sellerRowsError && sellerRows && sellerRows.length > 0) {
        const rpcResults = await Promise.all(
          sellerRows.map(async (seller) => {
            const { data, error } = await supabase.rpc('admin_get_seller_orders', {
              p_seller_id: seller.id,
            });
            return error ? [] : (data ?? []);
          })
        );

        const deduped = new Map<string, { created_at?: string | null }>();
        rpcResults.flat().forEach((order: any) => {
          if (!order?.id || !order?.created_at) return;
          if (!deduped.has(order.id)) deduped.set(order.id, order);
        });

        deduped.forEach((order) => {
          if (!order.created_at) return;
          const key = toISODate(new Date(order.created_at));
          if (ordersByDay.has(key)) ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
        });
      }
    }

    setOrdersTrendData(
      dateKeys.map((key, idx) => ({
        label: labels[idx],
        value: ordersByDay.get(key) ?? 0,
      }))
    );

    const normalizeUniversity = (value: unknown) => {
      if (typeof value !== 'string') return 'Unspecified';
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : 'Unspecified';
    };

    const sellerUniversityMap = new Map<string, string>();
    (universitySellersRes.data ?? []).forEach((row: { id?: string | null; university?: string | null }) => {
      if (!row?.id) return;
      sellerUniversityMap.set(row.id, normalizeUniversity(row.university));
    });

    const universityAggregation = new Map<string, { products: number; events: number; orders: number }>();

    const ensureBucket = (university: string) => {
      if (!universityAggregation.has(university)) {
        universityAggregation.set(university, { products: 0, events: 0, orders: 0 });
      }
      return universityAggregation.get(university)!;
    };

    (universityProductsRes.data ?? []).forEach((row: { seller_id?: string | null }) => {
      const university = normalizeUniversity(row?.seller_id ? sellerUniversityMap.get(row.seller_id) : null);
      ensureBucket(university).products += 1;
    });

    (universityEventsRes.data ?? []).forEach((row: { university?: string | null }) => {
      const university = normalizeUniversity(row?.university);
      ensureBucket(university).events += 1;
    });

    const directOrders = universityOrdersRes.data ?? [];
    if (!universityOrdersRes.error && directOrders.length > 0) {
      directOrders.forEach((row: { seller_id?: string | null }) => {
        const university = normalizeUniversity(row?.seller_id ? sellerUniversityMap.get(row.seller_id) : null);
        ensureBucket(university).orders += 1;
      });
    } else if ((universitySellersRes.data ?? []).length > 0) {
      const rpcOrderIds = new Set<string>();
      await Promise.all(
        (universitySellersRes.data ?? []).map(async (seller: { id?: string | null; university?: string | null }) => {
          if (!seller?.id) return;
          const { data, error } = await supabase.rpc('admin_get_seller_orders', {
            p_seller_id: seller.id,
          });
          if (error || !data) return;

          const university = normalizeUniversity(seller.university);
          data.forEach((order: { id?: string | null }) => {
            if (!order?.id || rpcOrderIds.has(order.id)) return;
            rpcOrderIds.add(order.id);
            ensureBucket(university).orders += 1;
          });
        })
      );
    }

    const universityRows = Array.from(universityAggregation.entries())
      .map(([university, values]) => ({
        university,
        products: values.products,
        events: values.events,
        orders: values.orders,
        total: values.products + values.events + values.orders,
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    setUniversityActivityData(universityRows);

    setLastUpdatedAt(new Date().toISOString());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadOverview(true);

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        void loadOverview(false);
      }, 500);
    };

    const channel = supabase
      .channel('admin-overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
      .subscribe();

    const interval = setInterval(() => {
      void loadOverview(false);
    }, 60000);

    return () => {
      clearInterval(interval);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [loadOverview]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadOverview(false);
  }, [loadOverview]);

  const metricCards: {
    key: string;
    label: string;
    value: number;
    hint: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
  }[] = [
    {
      key: 'users',
      label: 'Total Users',
      value: stats.totalUsers,
      hint: `${stats.totalSellers} sellers • ${stats.totalBuyers} buyers`,
      icon: 'people-outline',
      iconColor: '#1D4ED8',
      iconBg: '#EFF6FF',
    },
    {
      key: 'products',
      label: 'Total Products',
      value: stats.totalProducts,
      hint: `${stats.newProducts7d} new in last 7 days`,
      icon: 'cube-outline',
      iconColor: '#7C3AED',
      iconBg: '#F5F3FF',
    },
    {
      key: 'events',
      label: 'Total Events',
      value: stats.totalEvents,
      hint: `${stats.eventsToday} today • ${stats.eventsThisWeek} this week`,
      icon: 'calendar-outline',
      iconColor: '#059669',
      iconBg: '#ECFDF5',
    },
    {
      key: 'announcements',
      label: 'Announcements',
      value: stats.totalAnnouncements,
      hint: 'Active communication volume',
      icon: 'megaphone-outline',
      iconColor: '#EA580C',
      iconBg: '#FFF7ED',
    },
    {
      key: 'orders',
      label: 'Total Orders',
      value: stats.totalOrders,
      hint: `${stats.totalCompletedOrders} completed`,
      icon: 'receipt-outline',
      iconColor: '#0369A1',
      iconBg: '#F0F9FF',
    },
    {
      key: 'revenue-completed',
      label: 'Revenue (Completed)',
      value: stats.totalRevenueCompleted,
      hint: 'Based on completed orders',
      icon: 'cash-outline',
      iconColor: '#15803D',
      iconBg: '#ECFDF5',
    },
    {
      key: 'new-users',
      label: 'New Users (7d)',
      value: stats.newUsers7d,
      hint: 'Recent growth trend',
      icon: 'trending-up-outline',
      iconColor: '#0F766E',
      iconBg: '#F0FDFA',
    },
  ];

  const renderActivitySection = (title: string, icon: keyof typeof Ionicons.glyphMap, items: ActivityItem[]) => (
    <Pressable
      {...getHoverHandlers(`activity-${title}`)}
      style={[
        styles.activityCard,
        { width: activityCardWidth },
        hoveredCardId === `activity-${title}` && styles.interactiveCardHover,
      ]}
    >
      <View style={styles.activityHeader}>
        <View style={styles.activityHeaderLeft}>
          <View style={styles.activityIconWrap}>
            <Ionicons name={icon} size={14} color="#334155" />
          </View>
          <Text style={styles.activityTitle}>{title}</Text>
        </View>
        <View style={styles.activityCountBadge}>
          <Text style={styles.activityCountBadgeText}>{items.length}</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyActivityWrap}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#64748B" />
          <Text style={styles.emptyActivityText}>No recent activity found.</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {items.map((item) => (
            <View key={item.id} style={styles.activityItem}>
              <View style={styles.activityItemMain}>
                <View style={styles.activityItemDot} />
                <View style={styles.activityItemContent}>
                  <Text style={styles.activityItemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.activityItemMeta} numberOfLines={1}>{item.meta}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={14} color="#94A3B8" />
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );

  const donutSlices = useMemo<DonutSlice[]>(
    () => [
      { label: 'Users', value: stats.totalUsers, color: '#2563EB' },
      { label: 'Products', value: stats.totalProducts, color: '#7C3AED' },
      { label: 'Events', value: stats.totalEvents, color: '#059669' },
      { label: 'Announcements', value: stats.totalAnnouncements, color: '#EA580C' },
      { label: 'Orders', value: stats.totalOrders, color: '#0369A1' },
    ],
    [stats.totalUsers, stats.totalProducts, stats.totalEvents, stats.totalAnnouncements, stats.totalOrders]
  );

  const donutTotal = donutSlices.reduce((sum, slice) => sum + slice.value, 0);

  const audienceTotal = stats.totalSellers + stats.totalBuyers;
  const sellerShare = audienceTotal > 0 ? Math.round((stats.totalSellers / audienceTotal) * 100) : 0;
  const buyerShare = audienceTotal > 0 ? 100 - sellerShare : 0;
  const audienceSlices = useMemo(
    () => [
      { label: 'Sellers', value: stats.totalSellers },
      { label: 'Buyers', value: stats.totalBuyers },
    ],
    [stats.totalSellers, stats.totalBuyers]
  );
  const totalOrderStatuses = orderStatusData.reduce((sum, item) => sum + item.value, 0);
  const maxUniversityActivityTotal = Math.max(1, ...universityActivityData.map((item) => item.total));
  const totalUniversityActivities = universityActivityData.reduce((sum, item) => sum + item.total, 0);
  const topUniversityActivity = universityActivityData[0]?.university ?? 'N/A';
  const universityShareSlices = useMemo(() => {
    const palette = ['#1D4ED8', '#7C3AED', '#059669', '#EA580C', '#0369A1'];
    const topUniversities = universityActivityData.slice(0, 5).map((item, index) => ({
      label: item.university,
      value: item.total,
      color: palette[index % palette.length],
    }));

    const othersValue = universityActivityData
      .slice(5)
      .reduce((sum, item) => sum + item.total, 0);

    if (othersValue > 0) {
      topUniversities.push({
        label: 'Others',
        value: othersValue,
        color: '#94A3B8',
      });
    }

    return topUniversities.filter((slice) => slice.value > 0);
  }, [universityActivityData]);
  const universityShareTotal = universityShareSlices.reduce((sum, slice) => sum + slice.value, 0);

  const activityCardWidth = useMemo(() => {
    if (width >= 1300) return '32%';
    if (width >= 800) return '49%';
    return '100%';
  }, [width]);

  const getHoveredSliceLabelPosition = useCallback(
    (
      slices: { label: string; value: number }[],
      hovered: DonutHoverState | null,
      total: number,
      center: number,
      radius: number,
      padding: number
    ): SliceLabelPosition | null => {
      if (!hovered || total <= 0) return null;

      let cumulativeRatio = 0;
      const chartSize = center * 2;
      for (const slice of slices) {
        const ratio = slice.value / total;
        if (slice.label === hovered.label) {
          const angle = (cumulativeRatio + ratio / 2) * Math.PI * 2 - Math.PI / 2;
          const horizontal = Math.cos(angle);
          const vertical = Math.sin(angle);

          const lineStartX = center + horizontal * (radius + 4);
          const lineStartY = center + vertical * (radius + 4);
          const x = center + horizontal * (radius + padding);
          const y = center + vertical * (radius + padding);
          const safeY = Math.max(12, Math.min(chartSize - 12, y));

          if (horizontal > 0.2) {
            const safeX = Math.min(chartSize - 8, x);
            return {
              x: safeX,
              y: safeY,
              anchor: 'end',
              lineStartX,
              lineStartY,
              lineEndX: safeX - 3,
              lineEndY: safeY,
            };
          }

          if (horizontal < -0.2) {
            const safeX = Math.max(8, x);
            return {
              x: safeX,
              y: safeY,
              anchor: 'start',
              lineStartX,
              lineStartY,
              lineEndX: safeX + 3,
              lineEndY: safeY,
            };
          }

          return {
            x,
            y: safeY,
            anchor: 'middle',
            lineStartX,
            lineStartY,
            lineEndX: x,
            lineEndY: safeY,
          };
        }
        cumulativeRatio += ratio;
      }

      return null;
    },
    []
  );

  const hoveredDonutPosition = useMemo(
    () => getHoveredSliceLabelPosition(donutSlices, hoveredDonut, donutTotal, donutCenter, donutOuterRadius, isSmallScreen ? 16 : 20),
    [donutSlices, hoveredDonut, donutTotal, donutCenter, donutOuterRadius, isSmallScreen, getHoveredSliceLabelPosition]
  );

  const hoveredOrderStatusPosition = useMemo(
    () =>
      getHoveredSliceLabelPosition(
        orderStatusData,
        hoveredOrderStatus,
        totalOrderStatuses,
        orderStatusPieCenter,
        orderStatusPieRadius,
        isSmallScreen ? 12 : 16
      ),
    [
      orderStatusData,
      hoveredOrderStatus,
      totalOrderStatuses,
      orderStatusPieCenter,
      orderStatusPieRadius,
      isSmallScreen,
      getHoveredSliceLabelPosition,
    ]
  );

  const hoveredAudiencePosition = useMemo(
    () => getHoveredSliceLabelPosition(audienceSlices, hoveredAudienceMix, audienceTotal, audiencePieCenter, audiencePieRadius, isTinyScreen ? 9 : 11),
    [audienceSlices, hoveredAudienceMix, audienceTotal, audiencePieCenter, audiencePieRadius, isTinyScreen, getHoveredSliceLabelPosition]
  );

  const hoveredUniversitySharePosition = useMemo(
    () =>
      getHoveredSliceLabelPosition(
        universityShareSlices,
        hoveredUniversityShare,
        universityShareTotal,
        universitySharePieCenter,
        universitySharePieRadius,
        isSmallScreen ? 12 : 16
      ),
    [
      universityShareSlices,
      hoveredUniversityShare,
      universityShareTotal,
      universitySharePieCenter,
      universitySharePieRadius,
      isSmallScreen,
      getHoveredSliceLabelPosition,
    ]
  );

  const renderHoveredSliceLabel = (
    hovered: DonutHoverState | null,
    position: SliceLabelPosition | null,
    chartSize: number,
    compact = false
  ) => {
    if (!hovered || !position) return null;

    const labelText = hovered.label;
    const valueText = `Count: ${hovered.value.toLocaleString()}`;
    const bannerHeight = compact ? 34 : 38;
    const bannerWidth = Math.max(
      compact ? 96 : 118,
      Math.min(
        compact ? 150 : 190,
        Math.max(labelText.length, valueText.length) * (compact ? 5.4 : 6.1) + 20
      )
    );

    let bannerX =
      position.anchor === 'end'
        ? position.x - bannerWidth
        : position.anchor === 'start'
          ? position.x
          : position.x - bannerWidth / 2;
    bannerX = Math.max(4, Math.min(chartSize - bannerWidth - 4, bannerX));

    let bannerY = position.y - bannerHeight / 2;
    bannerY = Math.max(4, Math.min(chartSize - bannerHeight - 4, bannerY));

    const lineTargetX =
      position.lineEndX < bannerX
        ? bannerX
        : position.lineEndX > bannerX + bannerWidth
          ? bannerX + bannerWidth
          : position.lineEndX;
    const lineTargetY = Math.max(
      bannerY + 6,
      Math.min(bannerY + bannerHeight - 6, position.lineEndY)
    );

    return (
      <>
        <Line
          x1={position.lineStartX}
          y1={position.lineStartY}
          x2={lineTargetX}
          y2={lineTargetY}
          stroke="#94A3B8"
          strokeWidth={compact ? 1 : 1.25}
        />
        <Rect
          x={bannerX}
          y={bannerY}
          width={bannerWidth}
          height={bannerHeight}
          rx={8}
          fill="#FFFFFF"
          stroke={hovered.color}
          strokeWidth={1.2}
        />
        <Rect
          x={bannerX}
          y={bannerY}
          width={3}
          height={bannerHeight}
          rx={2}
          fill={hovered.color}
        />
        <SvgText
          x={bannerX + 10}
          y={bannerY + (compact ? 12 : 13)}
          fontSize={compact ? '8' : '9'}
          fill="#334155"
          textAnchor="start"
          fontWeight="700"
        >
          {labelText}
        </SvgText>
        <SvgText
          x={bannerX + 10}
          y={bannerY + (compact ? 25 : 28)}
          fontSize={compact ? '9' : '10'}
          fill="#0F172A"
          textAnchor="start"
          fontWeight="700"
        >
          {valueText}
        </SvgText>
      </>
    );
  };

  const getHoverHandlers = (cardId: string) => {
    if (Platform.OS !== 'web') return {};

    return {
      onHoverIn: () => setHoveredCardId(cardId),
      onHoverOut: () =>
        setHoveredCardId((current) => (current === cardId ? null : current)),
    };
  };

  const getSvgHoverHandlers = (onEnter: () => void, onLeave: () => void) => {
    const webHandlers = Platform.OS === 'web'
      ? ({ onMouseEnter: onEnter, onMouseLeave: onLeave } as Record<string, unknown>)
      : {};

    return {
      ...webHandlers,
      onPressIn: onEnter,
      onPressOut: onLeave,
    } as Record<string, unknown>;
  };

  const ChartLegend = ({ color, label, value }: { color: string; label: string; value: number }) => (
    <View style={styles.chartLegendItem}>
      <View style={[styles.chartLegendDot, { backgroundColor: color }]} />
      <Text style={styles.chartLegendLabel}>{label}</Text>
      <Text style={styles.chartLegendValue}>{value.toLocaleString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading overview...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { padding: contentPadding, paddingBottom: isSmallScreen ? 20 : 28 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.pageTitle, isSmallScreen && styles.pageTitleSmall]}>Overview</Text>
        </View>
        <TouchableOpacity style={[styles.refreshButton, isTinyScreen && styles.refreshButtonSmall]} onPress={() => onRefresh()}>
          <Ionicons name="refresh-outline" size={14} color="#1D4ED8" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.liveRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.lastUpdatedText}>
          {lastUpdatedAt ? `Updated ${formatTimeAgo(lastUpdatedAt)}` : 'Waiting for first update'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Visual Analytics</Text>
      </View>

      <View style={styles.chartsGrid}>
        <Pressable
          {...getHoverHandlers('chart-trend')}
          style={[
            styles.chartCard,
            width >= 900 ? styles.chartCardWide : null,
            isMobileScreen && styles.fullWidthCard,
            isTinyScreen && styles.compactCard,
            hoveredCardId === 'chart-trend' && styles.interactiveCardHover,
          ]}
        >
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Ionicons name="analytics-outline" size={16} color="#334155" />
              <Text style={styles.chartTitle}>7-Day Activity Trend</Text>
            </View>
            <Text style={styles.chartSubtitle}>Users, products, and events by day</Text>
          </View>

          <View style={[styles.trendLegendRow, isTinyScreen && styles.trendLegendRowTiny]}>
            <ChartLegend color="#2563EB" label="Users" value={trendData.reduce((sum, row) => sum + row.users, 0)} />
            <ChartLegend color="#7C3AED" label="Products" value={trendData.reduce((sum, row) => sum + row.products, 0)} />
            <ChartLegend color="#059669" label="Events" value={trendData.reduce((sum, row) => sum + row.events, 0)} />
          </View>

          <View style={styles.trendChartWrap}>
            <Svg width="100%" height={isTinyScreen ? 160 : isSmallScreen ? 180 : 210} viewBox="0 0 640 210">
              <Rect x={0} y={0} width={640} height={210} fill="#FFFFFF" />
              <Rect x={44} y={24} width={572} height={150} fill="#F8FAFC" rx={8} />

              {trendData.map((row, index) => {
                const maxValue = Math.max(
                  1,
                  ...trendData.map((point) => Math.max(point.users, point.products, point.events))
                );
                const groupWidth = 572 / Math.max(trendData.length, 1);
                const groupX = 44 + index * groupWidth;
                const barWidth = Math.max(8, (groupWidth - 20) / 3);
                const chartHeight = 130;
                const baseY = 24 + chartHeight;
                const usersHeight = (row.users / maxValue) * chartHeight;
                const productsHeight = (row.products / maxValue) * chartHeight;
                const eventsHeight = (row.events / maxValue) * chartHeight;

                return (
                  <G key={`${row.label}-${index}`}>
                    <Rect
                      x={groupX + 6}
                      y={baseY - usersHeight}
                      width={barWidth}
                      height={usersHeight}
                      rx={3}
                      fill="#2563EB"
                      opacity={hoveredTrend && !(hoveredTrend.label === row.label && hoveredTrend.series === 'Users') ? 0.55 : 1}
                      {...getSvgHoverHandlers(
                        () => setHoveredTrend({ label: row.label, series: 'Users', value: row.users }),
                        () => setHoveredTrend((current) => (current?.label === row.label && current?.series === 'Users' ? null : current))
                      )}
                    />
                    <Rect
                      x={groupX + 10 + barWidth}
                      y={baseY - productsHeight}
                      width={barWidth}
                      height={productsHeight}
                      rx={3}
                      fill="#7C3AED"
                      opacity={hoveredTrend && !(hoveredTrend.label === row.label && hoveredTrend.series === 'Products') ? 0.55 : 1}
                      {...getSvgHoverHandlers(
                        () => setHoveredTrend({ label: row.label, series: 'Products', value: row.products }),
                        () => setHoveredTrend((current) => (current?.label === row.label && current?.series === 'Products' ? null : current))
                      )}
                    />
                    <Rect
                      x={groupX + 14 + barWidth * 2}
                      y={baseY - eventsHeight}
                      width={barWidth}
                      height={eventsHeight}
                      rx={3}
                      fill="#059669"
                      opacity={hoveredTrend && !(hoveredTrend.label === row.label && hoveredTrend.series === 'Events') ? 0.55 : 1}
                      {...getSvgHoverHandlers(
                        () => setHoveredTrend({ label: row.label, series: 'Events', value: row.events }),
                        () => setHoveredTrend((current) => (current?.label === row.label && current?.series === 'Events' ? null : current))
                      )}
                    />
                    <SvgText x={groupX + groupWidth / 2} y={188} fontSize={isTinyScreen ? '9' : '10'} fill="#64748B" textAnchor="middle">
                      {row.label}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
        </Pressable>

        <Pressable
          {...getHoverHandlers('chart-distribution')}
          style={[
            styles.chartCard,
            isMobileScreen && styles.fullWidthCard,
            isTinyScreen && styles.compactCard,
            hoveredCardId === 'chart-distribution' && styles.interactiveCardHover,
          ]}
        >
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Ionicons name="pie-chart-outline" size={16} color="#334155" />
              <Text style={styles.chartTitle}>Data Distribution</Text>
            </View>
            <Text style={styles.chartSubtitle}>Share of total records by module</Text>
          </View>

          <View style={styles.donutWrap}>
            <Svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} style={styles.pieSvg}>
              <G rotation={-90} origin={`${donutCenter},${donutCenter}`}>
                {(() => {
                  const circumference = 2 * Math.PI * donutOuterRadius;
                  let offsetAccumulator = 0;

                  return donutSlices.map((slice) => {
                    const ratio = donutTotal > 0 ? slice.value / donutTotal : 0;
                    const segment = circumference * ratio;
                    const percent = donutTotal > 0 ? Math.round((slice.value / donutTotal) * 100) : 0;
                    const circle = (
                      <Circle
                        key={slice.label}
                        cx={donutCenter}
                        cy={donutCenter}
                        r={donutOuterRadius}
                        stroke={slice.color}
                        strokeWidth={hoveredDonut?.label === slice.label ? (isSmallScreen ? 22 : 26) : (isSmallScreen ? 18 : 22)}
                        fill="none"
                        strokeDasharray={`${segment} ${circumference}`}
                        strokeDashoffset={-offsetAccumulator}
                        strokeLinecap="butt"
                        opacity={hoveredDonut && hoveredDonut.label !== slice.label ? 0.45 : 1}
                        {...getSvgHoverHandlers(
                          () => setHoveredDonut({ label: slice.label, value: slice.value, percent, color: slice.color }),
                          () => setHoveredDonut((current) => (current?.label === slice.label ? null : current))
                        )}
                      />
                    );
                    offsetAccumulator += segment;
                    return circle;
                  });
                })()}
              </G>
              <Circle cx={donutCenter} cy={donutCenter} r={donutInnerRadius} fill="#FFFFFF" />
              <SvgText x={donutCenter} y={donutCenter - 5} fontSize={isSmallScreen ? '10' : '12'} fill="#64748B" textAnchor="middle">
                Total
              </SvgText>
              <SvgText x={donutCenter} y={donutCenter + 16} fontSize={isSmallScreen ? '16' : '18'} fontWeight="700" fill="#0F172A" textAnchor="middle">
                {donutTotal.toLocaleString()}
              </SvgText>
              {renderHoveredSliceLabel(hoveredDonut, hoveredDonutPosition, donutSize)}
            </Svg>
          </View>

          <View style={styles.chartLegendList}>
            {donutSlices.map((slice) => (
              <ChartLegend
                key={slice.label}
                color={slice.color}
                label={slice.label}
                value={slice.value}
              />
            ))}
          </View>
        </Pressable>

      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Order Statistics</Text>
      </View>

      <View style={styles.chartsGrid}>
        <Pressable
          {...getHoverHandlers('chart-orders')}
          style={[
            styles.chartCard,
            isMobileScreen && styles.fullWidthCard,
            isTinyScreen && styles.compactCard,
            hoveredCardId === 'chart-orders' && styles.interactiveCardHover,
          ]}
        >
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Ionicons name="receipt-outline" size={16} color="#334155" />
              <Text style={styles.chartTitle}>Orders Statistics</Text>
            </View>
          </View>

          <View style={styles.ordersSummaryGrid}>
            <View style={styles.ordersSummaryCard}>
              <Text style={styles.ordersSummaryLabel}>Total Orders</Text>
              <Text style={styles.ordersSummaryValue}>{stats.totalOrders.toLocaleString()}</Text>
            </View>
            <View style={styles.ordersSummaryCard}>
              <Text style={styles.ordersSummaryLabel}>Completed Orders</Text>
              <Text style={styles.ordersSummaryValue}>{stats.totalCompletedOrders.toLocaleString()}</Text>
            </View>
            <View style={styles.ordersSummaryCard}>
              <Text style={styles.ordersSummaryLabel}>Revenue (Completed)</Text>
              <Text style={styles.ordersSummaryValue}>GH₵{stats.totalRevenueCompleted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>

          <View style={styles.ordersStatusPieSection}>
            <View style={styles.ordersStatusPieWrap}>
              <Svg width={orderStatusPieSize} height={orderStatusPieSize} viewBox={`0 0 ${orderStatusPieSize} ${orderStatusPieSize}`} style={styles.pieSvg}>
                <G rotation={-90} origin={`${orderStatusPieCenter},${orderStatusPieCenter}`}>
                  {(() => {
                    const circumference = 2 * Math.PI * orderStatusPieRadius;
                    let offsetAccumulator = 0;

                    return orderStatusData.map((slice) => {
                      const ratio = totalOrderStatuses > 0 ? slice.value / totalOrderStatuses : 0;
                      const segment = circumference * ratio;
                      const percent = totalOrderStatuses > 0 ? Math.round((slice.value / totalOrderStatuses) * 100) : 0;

                      const circle = (
                        <Circle
                          key={slice.key}
                          cx={orderStatusPieCenter}
                          cy={orderStatusPieCenter}
                          r={orderStatusPieRadius}
                          stroke={slice.color}
                          strokeWidth={hoveredOrderStatus?.label === slice.label ? 20 : 16}
                          fill="none"
                          strokeDasharray={`${segment} ${circumference}`}
                          strokeDashoffset={-offsetAccumulator}
                          strokeLinecap="butt"
                          opacity={hoveredOrderStatus && hoveredOrderStatus.label !== slice.label ? 0.4 : 1}
                          {...getSvgHoverHandlers(
                            () => setHoveredOrderStatus({ label: slice.label, value: slice.value, percent, color: slice.color }),
                            () => setHoveredOrderStatus((current) => (current?.label === slice.label ? null : current))
                          )}
                        />
                      );

                      offsetAccumulator += segment;
                      return circle;
                    });
                  })()}
                </G>
                <Circle cx={orderStatusPieCenter} cy={orderStatusPieCenter} r={orderStatusPieInner} fill="#FFFFFF" />
                <SvgText x={orderStatusPieCenter} y={orderStatusPieCenter - 4} fontSize={isTinyScreen ? '9' : '10'} fill="#64748B" textAnchor="middle">
                  Orders
                </SvgText>
                <SvgText x={orderStatusPieCenter} y={orderStatusPieCenter + 14} fontSize={isTinyScreen ? '14' : '16'} fontWeight="700" fill="#0F172A" textAnchor="middle">
                  {stats.totalOrders.toLocaleString()}
                </SvgText>
                {renderHoveredSliceLabel(hoveredOrderStatus, hoveredOrderStatusPosition, orderStatusPieSize, isTinyScreen)}
              </Svg>
            </View>

            <View style={styles.ordersStatusLegend}>
              {orderStatusData.map((item) => (
                <View key={item.key} style={styles.ordersStatusLegendItem}>
                  <View style={[styles.ordersStatusLegendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.ordersStatusLegendLabel}>{item.label}</Text>
                  <Text style={styles.ordersStatusLegendValue}>{item.value.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>

        </Pressable>
      </View>

      <View style={styles.executiveGrid}>
        <Pressable
          {...getHoverHandlers('executive-audience-mix')}
          style={[
            styles.executiveCard,
            isMobileScreen && styles.fullWidthCard,
            isTinyScreen && styles.compactCard,
            hoveredCardId === 'executive-audience-mix' && styles.interactiveCardHover,
          ]}
        >
          <Text style={styles.executiveSideTitle}>Audience Mix</Text>
          <View style={styles.audienceChartWrap}>
            <Svg width={audiencePieSize} height={audiencePieSize} viewBox={`0 0 ${audiencePieSize} ${audiencePieSize}`} style={styles.pieSvg}>
              <G rotation={-90} origin={`${audiencePieCenter},${audiencePieCenter}`}>
                {(() => {
                  const circumference = 2 * Math.PI * audiencePieRadius;
                  const sellerSegment = audienceTotal > 0 ? circumference * (stats.totalSellers / audienceTotal) : 0;
                  const buyerSegment = audienceTotal > 0 ? circumference * (stats.totalBuyers / audienceTotal) : 0;
                  return (
                    <>
                      <Circle
                        cx={audiencePieCenter}
                        cy={audiencePieCenter}
                        r={audiencePieRadius}
                        stroke="#1D4ED8"
                        strokeWidth={hoveredAudienceMix?.label === 'Sellers' ? (isTinyScreen ? 14 : 16) : (isTinyScreen ? 12 : 14)}
                        fill="none"
                        strokeDasharray={`${sellerSegment} ${circumference}`}
                        strokeDashoffset={0}
                        strokeLinecap="butt"
                        opacity={hoveredAudienceMix && hoveredAudienceMix.label !== 'Sellers' ? 0.45 : 1}
                        {...getSvgHoverHandlers(
                          () => setHoveredAudienceMix({ label: 'Sellers', value: stats.totalSellers, percent: sellerShare, color: '#1D4ED8' }),
                          () => setHoveredAudienceMix((current) => (current?.label === 'Sellers' ? null : current))
                        )}
                      />
                      <Circle
                        cx={audiencePieCenter}
                        cy={audiencePieCenter}
                        r={audiencePieRadius}
                        stroke="#10B981"
                        strokeWidth={hoveredAudienceMix?.label === 'Buyers' ? (isTinyScreen ? 14 : 16) : (isTinyScreen ? 12 : 14)}
                        fill="none"
                        strokeDasharray={`${buyerSegment} ${circumference}`}
                        strokeDashoffset={-sellerSegment}
                        strokeLinecap="butt"
                        opacity={hoveredAudienceMix && hoveredAudienceMix.label !== 'Buyers' ? 0.45 : 1}
                        {...getSvgHoverHandlers(
                          () => setHoveredAudienceMix({ label: 'Buyers', value: stats.totalBuyers, percent: buyerShare, color: '#10B981' }),
                          () => setHoveredAudienceMix((current) => (current?.label === 'Buyers' ? null : current))
                        )}
                      />
                    </>
                  );
                })()}
              </G>
              <Circle cx={audiencePieCenter} cy={audiencePieCenter} r={audiencePieInner} fill="#FFFFFF" />
              <SvgText x={audiencePieCenter} y={audiencePieCenter - 3} fontSize={isTinyScreen ? '9' : '10'} fill="#64748B" textAnchor="middle">
                Audience
              </SvgText>
              <SvgText x={audiencePieCenter} y={audiencePieCenter + 13} fontSize={isTinyScreen ? '13' : '15'} fontWeight="700" fill="#0F172A" textAnchor="middle">
                {audienceTotal.toLocaleString()}
              </SvgText>
              {renderHoveredSliceLabel(hoveredAudienceMix, hoveredAudiencePosition, audiencePieSize, true)}
            </Svg>
          </View>
          <View style={styles.audienceLegendRow}>
            <View style={styles.audienceLegendItem}>
              <View style={[styles.audienceLegendDot, { backgroundColor: '#1D4ED8' }]} />
              <Text style={styles.audienceLegendLabel}>Sellers</Text>
              <Text style={styles.audienceLegendValue}>{sellerShare}%</Text>
            </View>
            <View style={styles.audienceLegendItem}>
              <View style={[styles.audienceLegendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.audienceLegendLabel}>Buyers</Text>
              <Text style={styles.audienceLegendValue}>{buyerShare}%</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          {...getHoverHandlers('executive-highlights')}
          style={[
            styles.executiveCard,
            isMobileScreen && styles.fullWidthCard,
            isTinyScreen && styles.compactCard,
            hoveredCardId === 'executive-highlights' && styles.interactiveCardHover,
          ]}
        >
          <Text style={styles.executiveSideTitle}>Admin Highlights</Text>
          <View style={styles.highlightItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#0F766E" />
            <Text style={styles.highlightText}>{stats.eventsToday} events scheduled for today</Text>
          </View>
          <View style={styles.highlightItem}>
            <Ionicons name="people-outline" size={14} color="#1D4ED8" />
            <Text style={styles.highlightText}>{stats.newUsers7d} new users joined in 7 days</Text>
          </View>
          <View style={styles.highlightItem}>
            <Ionicons name="cube-outline" size={14} color="#7C3AED" />
            <Text style={styles.highlightText}>{stats.newProducts7d} products added in 7 days</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Core Metrics</Text>
      </View>

      <View style={styles.metricsRow}>
        {metricCards.map((card) => (
          <Pressable
            key={card.key}
            {...getHoverHandlers(`metric-${card.key}`)}
            style={[
              styles.metricCard,
              { width: cardWidth },
              isMobileScreen && styles.fullWidthCard,
              isTinyScreen && styles.compactCard,
              hoveredCardId === `metric-${card.key}` && styles.interactiveCardHover,
            ]}
          > 
            <View style={styles.metricTopRow}>
              <View style={[styles.metricIconWrap, { backgroundColor: card.iconBg }]}>
                <Ionicons name={card.icon} size={16} color={card.iconColor} />
              </View>
              <Text style={styles.metricLabel}>{card.label}</Text>
            </View>
            <Text style={styles.metricValue}>
              {card.key === 'revenue-completed'
                ? `GH₵${card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : card.value.toLocaleString()}
            </Text>
            <Text style={styles.metricHint}>{card.hint}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Activity Feed</Text>
      </View>

      <View style={styles.activityGrid}>
        {renderActivitySection('Recent Users', 'person-add-outline', recentUsers)}
        {renderActivitySection('Recent Products', 'pricetags-outline', recentProducts)}
        {renderActivitySection('Upcoming Events', 'calendar-number-outline', upcomingEvents)}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>University Activity Summary</Text>
      </View>

      <View style={styles.universityActivityCard}>
        <View style={styles.universityActivityIntroRow}>
          <Text style={styles.universityActivityIntroTitle}>Where platform activity comes from</Text>
          <Text style={styles.universityActivityIntroText}>Each university shows total activity, share contribution, and activity mix (Products, Events, Orders).</Text>
        </View>

        <View style={styles.universityActivitySummaryRow}>
          <View style={styles.universityActivitySummaryChip}>
            <Text style={styles.universityActivitySummaryLabel}>Active Universities</Text>
            <Text style={styles.universityActivitySummaryValue}>{universityActivityData.length}</Text>
          </View>
          <View style={styles.universityActivitySummaryChip}>
            <Text style={styles.universityActivitySummaryLabel}>Combined Activity</Text>
            <Text style={styles.universityActivitySummaryValue}>{totalUniversityActivities.toLocaleString()}</Text>
          </View>
          <View style={styles.universityActivitySummaryChipWide}>
            <Text style={styles.universityActivitySummaryLabel}>Top University</Text>
            <Text style={styles.universityActivitySummaryValueSmall} numberOfLines={1}>{topUniversityActivity}</Text>
          </View>
        </View>

        {universityShareSlices.length > 0 ? (
          <View style={styles.universityShareChartCard}>
            <View style={styles.universityShareHeaderRow}>
              <Text style={styles.universityShareTitle}>University Contribution Chart</Text>
              <Text style={styles.universityShareSubtitle}>Top contributors by total activity</Text>
            </View>

            <View style={styles.universityShareChartWrap}>
              <Svg width={universitySharePieSize} height={universitySharePieSize} viewBox={`0 0 ${universitySharePieSize} ${universitySharePieSize}`} style={styles.pieSvg}>
                <G rotation={-90} origin={`${universitySharePieCenter},${universitySharePieCenter}`}>
                  {(() => {
                    const circumference = 2 * Math.PI * universitySharePieRadius;
                    let offsetAccumulator = 0;

                    return universityShareSlices.map((slice) => {
                      const ratio = universityShareTotal > 0 ? slice.value / universityShareTotal : 0;
                      const segment = circumference * ratio;
                      const percent = universityShareTotal > 0 ? Math.round((slice.value / universityShareTotal) * 100) : 0;

                      const circle = (
                        <Circle
                          key={slice.label}
                          cx={universitySharePieCenter}
                          cy={universitySharePieCenter}
                          r={universitySharePieRadius}
                          stroke={slice.color}
                          strokeWidth={hoveredUniversityShare?.label === slice.label ? (isSmallScreen ? 20 : 24) : (isSmallScreen ? 16 : 20)}
                          fill="none"
                          strokeDasharray={`${segment} ${circumference}`}
                          strokeDashoffset={-offsetAccumulator}
                          strokeLinecap="butt"
                          opacity={hoveredUniversityShare && hoveredUniversityShare.label !== slice.label ? 0.45 : 1}
                          {...getSvgHoverHandlers(
                            () => setHoveredUniversityShare({ label: slice.label, value: slice.value, percent, color: slice.color }),
                            () => setHoveredUniversityShare((current) => (current?.label === slice.label ? null : current))
                          )}
                        />
                      );

                      offsetAccumulator += segment;
                      return circle;
                    });
                  })()}
                </G>
                <Circle cx={universitySharePieCenter} cy={universitySharePieCenter} r={universitySharePieInner} fill="#FFFFFF" />
                <SvgText x={universitySharePieCenter} y={universitySharePieCenter - 4} fontSize={isTinyScreen ? '9' : '10'} fill="#64748B" textAnchor="middle">
                  Total
                </SvgText>
                <SvgText x={universitySharePieCenter} y={universitySharePieCenter + 14} fontSize={isTinyScreen ? '13' : '15'} fontWeight="700" fill="#0F172A" textAnchor="middle">
                  {universityShareTotal.toLocaleString()}
                </SvgText>
                {renderHoveredSliceLabel(hoveredUniversityShare, hoveredUniversitySharePosition, universitySharePieSize, isTinyScreen)}
              </Svg>
            </View>

            <View style={styles.universityShareLegendList}>
              {universityShareSlices.map((slice) => {
                const percent = universityShareTotal > 0 ? Math.round((slice.value / universityShareTotal) * 100) : 0;
                return (
                  <View key={slice.label} style={styles.universityShareLegendItem}>
                    <View style={[styles.universityShareLegendDot, { backgroundColor: slice.color }]} />
                    <Text style={styles.universityShareLegendLabel} numberOfLines={1}>{slice.label}</Text>
                    <Text style={styles.universityShareLegendValue}>{percent}%</Text>
                  </View>
                );
              })}
            </View>

          </View>
        ) : null}

        <View style={styles.universityActivityLegendRow}>
          <View style={styles.universityActivityLegendItem}>
            <View style={[styles.universityActivityLegendDot, { backgroundColor: '#7C3AED' }]} />
            <Text style={styles.universityActivityLegendLabel}>Products</Text>
          </View>
          <View style={styles.universityActivityLegendItem}>
            <View style={[styles.universityActivityLegendDot, { backgroundColor: '#059669' }]} />
            <Text style={styles.universityActivityLegendLabel}>Events</Text>
          </View>
          <View style={styles.universityActivityLegendItem}>
            <View style={[styles.universityActivityLegendDot, { backgroundColor: '#0369A1' }]} />
            <Text style={styles.universityActivityLegendLabel}>Orders</Text>
          </View>
        </View>

        {universityActivityData.length === 0 ? (
          <Text style={styles.universityActivityEmptyText}>No university activity data available yet.</Text>
        ) : (
          universityActivityData.map((row, index) => {
            const productsWidth = `${row.total > 0 ? (row.products / row.total) * 100 : 0}%` as `${number}%`;
            const eventsWidth = `${row.total > 0 ? (row.events / row.total) * 100 : 0}%` as `${number}%`;
            const ordersWidth = `${row.total > 0 ? (row.orders / row.total) * 100 : 0}%` as `${number}%`;
            const shareOfAll = totalUniversityActivities > 0 ? Math.round((row.total / totalUniversityActivities) * 100) : 0;
            const relativeStrengthWidth = `${(row.total / maxUniversityActivityTotal) * 100}%` as `${number}%`;
            const productsShare = row.total > 0 ? Math.round((row.products / row.total) * 100) : 0;
            const eventsShare = row.total > 0 ? Math.round((row.events / row.total) * 100) : 0;
            const ordersShare = row.total > 0 ? Math.round((row.orders / row.total) * 100) : 0;

            return (
              <View key={row.university} style={styles.universityActivityRow}>
                <View style={styles.universityActivityRankWrap}>
                  <Text style={styles.universityActivityRankText}>#{index + 1}</Text>
                </View>

                <View style={styles.universityActivityMain}>
                  <View style={styles.universityActivityTopRow}>
                    <Text style={styles.universityActivityName} numberOfLines={1}>{row.university}</Text>
                    <Text style={styles.universityActivityTotal}>{row.total.toLocaleString()} activities</Text>
                  </View>

                  <View style={styles.universityActivityMetaRow}>
                    <Text style={styles.universityActivityMetaText}>Share: {shareOfAll}% of all activity</Text>
                  </View>

                  <View style={styles.universityActivityStrengthTrack}>
                    <View style={[styles.universityActivityStrengthFill, { width: relativeStrengthWidth }]} />
                  </View>

                  <View style={styles.universityActivityTrack}>
                    <View style={[styles.universityActivityBar, { width: productsWidth, backgroundColor: '#7C3AED' }]} />
                    <View style={[styles.universityActivityBar, { width: eventsWidth, backgroundColor: '#059669' }]} />
                    <View style={[styles.universityActivityBar, { width: ordersWidth, backgroundColor: '#0369A1' }]} />
                  </View>

                  <View style={styles.universityActivityCountRow}>
                    <View style={styles.universityActivityCountChip}>
                      <Text style={styles.universityActivityCountText}>Products {row.products.toLocaleString()} ({productsShare}%)</Text>
                    </View>
                    <View style={styles.universityActivityCountChip}>
                      <Text style={styles.universityActivityCountText}>Events {row.events.toLocaleString()} ({eventsShare}%)</Text>
                    </View>
                    <View style={styles.universityActivityCountChip}>
                      <Text style={styles.universityActivityCountText}>Orders {row.orders.toLocaleString()} ({ordersShare}%)</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.universityActivityFootnote}>Tip: Higher bars indicate stronger relative performance compared to the top university.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  pageTitleSmall: {
    fontSize: 22,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748B',
  },
  pageSubtitleSmall: {
    fontSize: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshButtonSmall: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  liveRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.3,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#64748B',
  },
  errorCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    flex: 1,
  },
  interactiveCardHover: {
    borderColor: '#93C5FD',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    transform: [{ translateY: -3 }],
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },
  executiveGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  executiveCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDEAFE',
    backgroundColor: '#F8FAFF',
    padding: 14,
  },
  fullWidthCard: {
    width: '100%',
    minWidth: 0,
  },
  compactCard: {
    padding: 10,
    borderRadius: 12,
  },
  executiveSideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  highlightText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  metricsRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chartsGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chartCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartCardWide: {
    minWidth: 540,
  },
  chartHeader: {
    marginBottom: 10,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  chartSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  trendLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  trendLegendRowTiny: {
    justifyContent: 'flex-start',
    gap: 6,
  },
  trendChartWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieSvg: {
    overflow: 'visible',
  },
  chartLegendList: {
    marginTop: 6,
    gap: 2,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  chartLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  chartLegendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chartLegendValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  chartFrequencyBox: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartFrequencyText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  ordersSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  ordersSummaryCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ordersSummaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  ordersSummaryValue: {
    marginTop: 4,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '800',
  },
  ordersStatusPieSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  ordersStatusPieWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersStatusLegend: {
    flex: 1,
    minWidth: 180,
    gap: 4,
  },
  ordersStatusLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  ordersStatusLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  ordersStatusLegendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  ordersStatusLegendValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  metricCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  insightsGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  insightCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  insightValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  insightSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },
  audienceChartWrap: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceLegendRow: {
    marginTop: 10,
    gap: 8,
  },
  audienceLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  audienceLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  audienceLegendLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  audienceLegendValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  audienceHoverRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  audienceHoverText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  universityActivityCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FAFF',
    padding: 12,
    gap: 10,
  },
  universityActivityIntroRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  universityActivityIntroTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  universityActivityIntroText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  universityActivitySummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  universityActivitySummaryChip: {
    flex: 1,
    minWidth: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  universityActivitySummaryChipWide: {
    flex: 1.4,
    minWidth: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  universityActivitySummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  universityActivitySummaryValue: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  universityActivitySummaryValueSmall: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  universityShareChartCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 10,
  },
  universityShareHeaderRow: {
    gap: 2,
  },
  universityShareTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  universityShareSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  universityShareChartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  universityShareLegendList: {
    gap: 6,
  },
  universityShareLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  universityShareLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  universityShareLegendLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  universityShareLegendValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  universityActivityLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  universityActivityLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  universityActivityLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  universityActivityLegendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  universityActivityEmptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  universityActivityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  universityActivityRankWrap: {
    minWidth: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  universityActivityRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  universityActivityMain: {
    flex: 1,
    gap: 7,
  },
  universityActivityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  universityActivityName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  universityActivityTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  universityActivityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  universityActivityMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  universityActivityStrengthTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  universityActivityStrengthFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#93C5FD',
  },
  universityActivityTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  universityActivityBar: {
    height: '100%',
  },
  universityActivityCountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  universityActivityCountChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  universityActivityCountText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  universityActivityFootnote: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
  },
  activityGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  activityHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  activityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCountBadge: {
    minWidth: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  activityCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptyActivityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emptyActivityText: {
    fontSize: 13,
    color: '#64748B',
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  activityItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  activityItemDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 5,
    backgroundColor: '#60A5FA',
  },
  activityItemContent: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  activityItemMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },
});

export default AdminOverviewPage;
