import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameMonth,
  format,
  addDays,
} from 'date-fns';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

type DateSelection = {
  singleDate?: Date;
  dateRange?: { start: Date; end: Date };
  monthRange?: { start: Date; end: Date };
  year?: number;
  viewMode: CalendarViewMode;
};

type CalendarFilterProps = {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilter: (selection: DateSelection | null) => void;
  currentSelection: DateSelection | null;
  theme: any;
  styles: any;
};

export default function CalendarFilter({
  isVisible,
  onClose,
  onApplyFilter,
  currentSelection,
  theme,
  styles,
}: CalendarFilterProps) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';
  const modalHeight = '90%';

  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [monthRange, setMonthRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [quickFilter, setQuickFilter] = useState<'thisWeek' | 'thisMonth' | 'thisYear' | null>(null);

  useEffect(() => {
    if (currentSelection) {
      setViewMode(currentSelection.viewMode);
      setSelectedDate(currentSelection.singleDate || null);
      setDateRange(currentSelection.dateRange || null);
      setMonthRange(currentSelection.monthRange || null);
      setSelectedYear(currentSelection.year || new Date().getFullYear());
      if (currentSelection.singleDate) {
        setCurrentDate(new Date(currentSelection.singleDate));
      }
    }
  }, [currentSelection]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'day' || viewMode === 'week' || viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (viewMode === 'year') {
        newDate.setFullYear(prev.getFullYear() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  };

  const renderDayView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = i - startingDay + 1;
      const date = new Date(year, month, day);
      const isCurrentMonth = day > 0 && day <= daysInMonth;
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isToday = isSameDay(date, new Date());

      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.calendarDay,
            { backgroundColor: theme.surface },
            !isCurrentMonth && styles.calendarDayOtherMonth,
            isSelected && [styles.calendarDaySelected, { backgroundColor: theme.primary }],
            isToday && [styles.calendarDayToday, { borderColor: theme.primary }],
          ]}
          onPress={() => isCurrentMonth && setSelectedDate(date)}
          disabled={!isCurrentMonth}
        >
          <Text
            style={[
              styles.calendarDayText,
              { color: isCurrentMonth ? theme.text : theme.textTertiary },
              isSelected && styles.calendarDaySelectedText,
              isToday && { color: theme.primary, fontWeight: 'bold' },
            ]}
          >
            {isCurrentMonth ? day : ''}
          </Text>
        </TouchableOpacity>,
      );
    }

    return (
      <View style={styles.calendarGrid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={[styles.calendarWeekday, { color: theme.textTertiary }]}>
            {day}
          </Text>
        ))}
        {days}
      </View>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end: addDays(start, 6) });

    const isWeekSelected =
      dateRange && isSameDay(dateRange.start, start) && isSameDay(dateRange.end, addDays(start, 6));

    return (
      <View style={styles.weekViewContainer}>
        <Text style={[styles.weekRangeText, { color: theme.textSecondary }]}>
          {format(start, 'MMM d')} - {format(addDays(start, 6), 'MMM d, yyyy')}
        </Text>
        <TouchableOpacity
          style={[
            styles.weekSelector,
            { backgroundColor: theme.surface, borderColor: theme.border },
            isWeekSelected && [styles.weekSelected, { borderColor: theme.primary, backgroundColor: `${theme.primary}20` }],
          ]}
          onPress={() => {
            const start = startOfWeek(currentDate, { weekStartsOn: 0 });
            const end = endOfWeek(currentDate, { weekStartsOn: 0 });
            setDateRange({ start, end });
            setQuickFilter(null);
          }}
        >
          <Text
            style={[
              styles.weekSelectorText,
              { color: theme.text },
              isWeekSelected && { color: theme.primary, fontWeight: 'bold' },
            ]}
          >
            Select This Week
          </Text>
        </TouchableOpacity>
        <View style={styles.weekDaysGrid}>
          {days.map((day, index) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDay,
                  { backgroundColor: theme.surface },
                  isSelected && [styles.weekDaySelected, { backgroundColor: theme.primary }],
                  isToday && [styles.weekDayToday, { borderColor: theme.primary }],
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.weekDayName, { color: theme.textTertiary }]}>{format(day, 'EEE')}</Text>
                <Text
                  style={[
                    styles.weekDayNumber,
                    { color: theme.text },
                    isSelected && styles.weekDaySelectedText,
                    isToday && { color: theme.primary, fontWeight: 'bold' },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMonthView = () => {
    const months = eachMonthOfInterval({
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31),
    });

    const isMonthSelected = (month: Date) => {
      if (monthRange) {
        return (
          isSameMonth(month, monthRange.start) ||
          isSameMonth(month, monthRange.end) ||
          (month > monthRange.start && month < monthRange.end)
        );
      }
      return false;
    };

    return (
      <View style={styles.monthViewContainer}>
        <View style={styles.yearSelector}>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 1)}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: theme.text }]}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 1)}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.monthRangeSelector,
            { backgroundColor: theme.surface, borderColor: theme.border },
            quickFilter === 'thisMonth' && [styles.monthRangeSelected, { borderColor: theme.primary, backgroundColor: `${theme.primary}20` }],
          ]}
          onPress={() => {
            const start = startOfMonth(new Date());
            const end = endOfMonth(new Date());
            setMonthRange({ start, end });
            setQuickFilter('thisMonth');
          }}
        >
          <Text
            style={[
              styles.monthRangeText,
              { color: theme.text },
              quickFilter === 'thisMonth' && { color: theme.primary, fontWeight: 'bold' },
            ]}
          >
            Select This Month
          </Text>
        </TouchableOpacity>

        <View style={styles.monthsGrid}>
          {months.map((month, index) => {
            const isSelected = isMonthSelected(month);
            const isCurrentMonth = isSameMonth(month, new Date());

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.monthCell,
                  { backgroundColor: theme.surface },
                  isSelected && [styles.monthCellSelected, { backgroundColor: theme.primary }],
                  isCurrentMonth && [styles.monthCellCurrent, { borderColor: theme.primary }],
                ]}
                onPress={() => {
                  if (!monthRange) {
                    setMonthRange({ start: month, end: month });
                  } else if (isSameMonth(month, monthRange.start) && isSameMonth(month, monthRange.end)) {
                    setMonthRange(null);
                  } else if (month < monthRange.start) {
                    setMonthRange({ start: month, end: monthRange.end });
                  } else {
                    setMonthRange({ start: monthRange.start, end: month });
                  }
                  setQuickFilter(null);
                }}
              >
                <Text
                  style={[
                    styles.monthText,
                    { color: theme.text },
                    isSelected && styles.monthCellSelectedText,
                    isCurrentMonth && { color: theme.primary, fontWeight: 'bold' },
                  ]}
                >
                  {format(month, 'MMM')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderYearView = () => {
    const years = Array.from({ length: 12 }, (_, i) => selectedYear - 6 + i);

    return (
      <View style={styles.yearViewContainer}>
        <View style={styles.yearNavigation}>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 12)}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.yearRangeText, { color: theme.text }]}>
            {selectedYear - 6} - {selectedYear + 5}
          </Text>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 12)}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.yearQuickFilter,
            { backgroundColor: theme.surface, borderColor: theme.border },
            quickFilter === 'thisYear' && [styles.yearQuickFilterSelected, { borderColor: theme.primary, backgroundColor: `${theme.primary}20` }],
          ]}
          onPress={() => {
            const currentYear = new Date().getFullYear();
            setSelectedYear(currentYear);
            setQuickFilter('thisYear');
          }}
        >
          <Text
            style={[
              styles.yearQuickFilterText,
              { color: theme.text },
              quickFilter === 'thisYear' && { color: theme.primary, fontWeight: 'bold' },
            ]}
          >
            Select Current Year ({new Date().getFullYear()})
          </Text>
        </TouchableOpacity>

        <View style={styles.yearsGrid}>
          {years.map((year, index) => {
            const isCurrentYear = year === new Date().getFullYear();
            const isSelected = selectedYear === year;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.yearCell,
                  { backgroundColor: theme.surface },
                  isSelected && [styles.yearCellSelected, { backgroundColor: theme.primary }],
                  isCurrentYear && [styles.yearCellCurrent, { borderColor: theme.primary }],
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  setQuickFilter(null);
                }}
              >
                <Text
                  style={[
                    styles.yearCellText,
                    { color: theme.text },
                    isSelected && styles.yearCellSelectedText,
                    isCurrentYear && { color: theme.primary, fontWeight: 'bold' },
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const handleApply = () => {
    let selection: DateSelection | null = null;

    if (quickFilter === 'thisWeek') {
      const start = startOfWeek(new Date(), { weekStartsOn: 0 });
      const end = endOfWeek(new Date(), { weekStartsOn: 0 });
      selection = { dateRange: { start, end }, viewMode: 'week' };
    } else if (quickFilter === 'thisMonth') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      selection = { monthRange: { start, end }, viewMode: 'month' };
    } else if (quickFilter === 'thisYear') {
      const year = new Date().getFullYear();
      selection = { year, viewMode: 'year' };
    } else if (selectedDate && viewMode === 'day') {
      selection = { singleDate: selectedDate, viewMode: 'day' };
    } else if (dateRange && viewMode === 'week') {
      selection = { dateRange, viewMode: 'week' };
    } else if (monthRange && viewMode === 'month') {
      selection = { monthRange, viewMode: 'month' };
    } else if (viewMode === 'year') {
      selection = { year: selectedYear, viewMode: 'year' };
    }

    onApplyFilter(selection);
    onClose();
  };

  const handleClear = () => {
    setSelectedDate(null);
    setDateRange(null);
    setMonthRange(null);
    setSelectedYear(new Date().getFullYear());
    setQuickFilter(null);
    onApplyFilter(null);
    onClose();
  };

  const formatSelectionText = () => {
    if (quickFilter === 'thisWeek') return 'This Week';
    if (quickFilter === 'thisMonth') return 'This Month';
    if (quickFilter === 'thisYear') return 'This Year';
    if (selectedDate && viewMode === 'day') return format(selectedDate, 'MMM d, yyyy');
    if (dateRange && viewMode === 'week') return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
    if (monthRange && viewMode === 'month') {
      if (isSameMonth(monthRange.start, monthRange.end)) {
        return format(monthRange.start, 'MMMM yyyy');
      }
      return `${format(monthRange.start, 'MMM yyyy')} - ${format(monthRange.end, 'MMM yyyy')}`;
    }
    if (viewMode === 'year') return `Year: ${selectedYear}`;
    return 'No date selected';
  };

  if (!isVisible) return null;

  return (
    <Modal transparent={true} visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.calendarOverlay,
          {
            backgroundColor: theme.modalOverlay,
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={[
            styles.calendarContainer,
            {
              backgroundColor: theme.modalBackground,
              width: modalWidth,
              maxWidth: 800,
              height: modalHeight,
              borderRadius: isLargeScreen ? 20 : undefined,
              borderTopLeftRadius: isLargeScreen ? 20 : 20,
              borderTopRightRadius: isLargeScreen ? 20 : 20,
              alignSelf: 'center',
              marginHorizontal: isLargeScreen ? 'auto' : 0,
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
            },
          ]}
        >
          <View style={[styles.calendarHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.calendarCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.calendarTitle, { color: theme.text }]}>Select Date Range</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.calendarContent}>
            <View style={styles.quickFiltersContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Filters</Text>
              <View style={styles.quickFiltersGrid}>
                <TouchableOpacity
                  style={[
                    styles.quickFilterButton,
                    { backgroundColor: theme.surface },
                    quickFilter === 'thisWeek' && [styles.quickFilterActive, { backgroundColor: theme.primary }],
                  ]}
                  onPress={() => {
                    setQuickFilter('thisWeek');
                    setViewMode('week');
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={quickFilter === 'thisWeek' ? '#fff' : theme.text} />
                  <Text style={[styles.quickFilterText, { color: quickFilter === 'thisWeek' ? '#fff' : theme.text }]}>This Week</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickFilterButton,
                    { backgroundColor: theme.surface },
                    quickFilter === 'thisMonth' && [styles.quickFilterActive, { backgroundColor: theme.primary }],
                  ]}
                  onPress={() => {
                    setQuickFilter('thisMonth');
                    setViewMode('month');
                  }}
                >
                  <Ionicons name="calendar" size={20} color={quickFilter === 'thisMonth' ? '#fff' : theme.text} />
                  <Text style={[styles.quickFilterText, { color: quickFilter === 'thisMonth' ? '#fff' : theme.text }]}>This Month</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.viewModeContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>View Mode</Text>
              <View style={styles.viewModeButtons}>
                {(['day', 'week', 'month', 'year'] as CalendarViewMode[]).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.viewModeButton,
                      { backgroundColor: theme.surface },
                      viewMode === mode && [styles.viewModeButtonActive, { backgroundColor: theme.primary }],
                    ]}
                    onPress={() => {
                      setViewMode(mode);
                      setQuickFilter(null);
                    }}
                  >
                    <Text style={[styles.viewModeButtonText, { color: viewMode === mode ? '#fff' : theme.text }]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.selectionDisplay, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
              <Ionicons name="calendar" size={20} color={theme.primary} />
              <Text style={[styles.selectionText, { color: theme.primary }]}>{formatSelectionText()}</Text>
            </View>

            <View style={styles.calendarNavigation}>
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </TouchableOpacity>

              <Text style={[styles.currentDateText, { color: theme.text }]}>
                {viewMode === 'day' || viewMode === 'week'
                  ? format(currentDate, 'MMMM yyyy')
                  : viewMode === 'month'
                    ? `Year: ${selectedYear}`
                    : `${selectedYear - 6} - ${selectedYear + 5}`}
              </Text>

              <TouchableOpacity onPress={() => navigateMonth('next')}>
                <Ionicons name="chevron-forward" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarViewContainer}>
              {viewMode === 'day' && renderDayView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'year' && renderYearView()}
            </View>

            <View style={[styles.instructions, { backgroundColor: theme.surface }]}> 
              <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
                {viewMode === 'day'
                  ? 'Tap a day to select single date'
                  : viewMode === 'week'
                    ? 'Tap "Select This Week" or individual days'
                    : viewMode === 'month'
                      ? 'Tap months to select range (tap first and last)'
                      : 'Select year for annual filter'}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.calendarActions, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.calendarButton, styles.cancelButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleClear}
            >
              <Text style={[styles.calendarButtonText, { color: theme.text }]}>Clear Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.calendarButton, styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={handleApply}
            >
              <Text style={styles.calendarButtonText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}