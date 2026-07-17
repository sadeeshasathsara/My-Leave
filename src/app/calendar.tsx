import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { useLeaveStore } from '../storage/store';
import { Colors, LeaveTypeColors, Spacing, BorderRadius } from '../constants/theme';
import { LeaveRecord, LeaveType } from '../types';
import { fs } from '../constants/layout';

export default function CalendarScreen() {
  const systemScheme = useColorScheme();
  
  // Zustand Store
  const leaves = useLeaveStore((state) => state.leaves);
  const themeSetting = useLeaveStore((state) => state.settings.theme);
  const setAddLeaveModalOpen = useLeaveStore((state) => state.setAddLeaveModalOpen);
  
  const activeTheme: 'light' | 'dark' = themeSetting === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : (themeSetting === 'dark' ? 'dark' : 'light');
  const colors = Colors[activeTheme];

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<LeaveType | 'All'>('All');

  // Month stats
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Format date utility
  const getFormatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Calendar rendering math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter leaves dynamically based on search and type
  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const matchesSearch = leave.reason.toLowerCase().includes(search.toLowerCase());
      const matchesType = selectedType === 'All' || leave.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [leaves, search, selectedType]);

  // Helper: check if a date string falls on a leave record
  const getLeavesForDate = (dateStr: string): LeaveRecord[] => {
    return filteredLeaves.filter((leave) => {
      return leave.date === dateStr;
    });
  };

  // Leaves active on the selected date
  const selectedDateLeaves = useMemo(() => {
    return getLeavesForDate(selectedDateStr);
  }, [filteredLeaves, selectedDateStr]);

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add spacer days from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: '' });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = getFormatDateStr(year, month, i);
      days.push({
        day: i,
        dateStr,
      });
    }

    return days;
  }, [year, month, daysInMonth, firstDayIndex]);

  const handleSelectDate = (dateStr: string) => {
    if (dateStr) {
      setSelectedDateStr(dateStr);
    }
  };

  const navigateToEdit = (id: string) => {
    setAddLeaveModalOpen(true, id);
  };

  const navigateToQuickAdd = () => {
    setAddLeaveModalOpen(true, null, selectedDateStr);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Search and Filters Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.divider }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search leaves by reason..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Scrollable Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <Text style={[styles.filterTitle, { color: colors.textSecondary }]}>Type:</Text>
          {(['All', 'Casual', 'Vacation', 'Duty', 'Half Day'] as const).map((typeVal) => {
            const isSelected = selectedType === typeVal;
            return (
              <Pressable
                key={typeVal}
                style={[
                  styles.filterPill,
                  { 
                    backgroundColor: isSelected ? colors.primary : colors.divider,
                  }
                ]}
                onPress={() => setSelectedType(typeVal)}
              >
                <Text 
                  style={[
                    styles.filterPillText, 
                    { color: isSelected ? '#ffffff' : colors.textSecondary }
                  ]}
                >
                  {typeVal}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Calendar Card */}
        <View style={[styles.calendarCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header Month Navigation */}
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </Pressable>
            
            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {monthNames[month]} {year}
            </Text>

            <Pressable onPress={handleNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </Pressable>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekdaysRow}>
            {weekdays.map((day) => (
              <Text key={day} style={[styles.weekdayLabel, { color: colors.textMuted }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, index) => {
              if (item.day === null) {
                return <View key={`empty-${index}`} style={styles.dayBox} />;
              }

              const isSelected = item.dateStr === selectedDateStr;
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];
              const dateLeaves = getLeavesForDate(item.dateStr);
              const hasLeaves = dateLeaves.length > 0;

              return (
                <Pressable
                  key={item.dateStr}
                  style={[
                    styles.dayBox,
                    isSelected && [styles.selectedDay, { backgroundColor: colors.primary }],
                    !isSelected && isToday && [styles.todayDay, { borderColor: colors.primary }],
                  ]}
                  onPress={() => handleSelectDate(item.dateStr)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#ffffff' : colors.text },
                      isToday && !isSelected && { color: colors.primary, fontWeight: '700' }
                    ]}
                  >
                    {item.day}
                  </Text>
                  
                  {/* Leave Dots */}
                  {hasLeaves && (
                    <View style={styles.dotsContainer}>
                      {dateLeaves.slice(0, 3).map((l, i) => (
                        <View
                          key={l.id + '-' + i}
                          style={[
                            styles.dotIndicator,
                            { 
                              backgroundColor: isSelected ? '#ffffff' : (LeaveTypeColors[l.type] || colors.textMuted) 
                            }
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateLogsHeader}>
          <Text style={[styles.dateLogsTitle, { color: colors.text }]}>
            {selectedDateStr === new Date().toISOString().split('T')[0]
              ? 'Today'
              : new Date(selectedDateStr).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
          </Text>
          
          <Pressable 
            style={[styles.quickAddBtn, { backgroundColor: colors.primaryLight + '25' }]}
            onPress={navigateToQuickAdd}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.quickAddBtnText, { color: colors.primary }]}>Record</Text>
          </Pressable>
        </View>

        {/* Selected Date Entries */}
        {selectedDateLeaves.length === 0 ? (
          <View style={[styles.noLogCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.noLogText, { color: colors.textSecondary }]}>
              No leaves logged for this day.
            </Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {selectedDateLeaves.map((leave) => {
              const typeColor = LeaveTypeColors[leave.type] || colors.textMuted;
              
              return (
                <Pressable
                  key={leave.id}
                  style={[styles.logRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigateToEdit(leave.id)}
                >
                  <View style={styles.logLeft}>
                    <View style={[styles.logColorBar, { backgroundColor: typeColor }]} />
                    <View style={styles.logInfo}>
                      <Text style={[styles.logTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {leave.reason}
                      </Text>
                      <Text style={[styles.logType, { color: typeColor }]} numberOfLines={1} adjustsFontSizeToFit>
                        {leave.type} Leave
                      </Text>
                    </View>
                  </View>

                  <View style={styles.logRight}>
                    <View style={[styles.statusTag, { backgroundColor: typeColor + '12' }]}>
                      <Text style={[styles.statusTagText, { color: typeColor }]} numberOfLines={1}>
                        View Details
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  filterBar: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fs(14),
    padding: 0,
  },
  filtersScroll: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTitle: {
    fontSize: fs(12),
    fontWeight: '700',
    marginRight: 4,
    textTransform: 'uppercase',
  },
  filterPill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.round,
  },
  filterPillText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  scrollContainer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  calendarCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: fs(11),
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayBox: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  dayText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  selectedDay: {
    borderRadius: BorderRadius.md,
  },
  todayDay: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    gap: 3,
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.round,
  },
  dateLogsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dateLogsTitle: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  quickAddBtnText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  noLogCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  noLogText: {
    fontSize: fs(13),
  },
  logsList: {
    gap: Spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    height: 54,
    paddingRight: Spacing.md,
    overflow: 'hidden',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  logColorBar: {
    width: 5,
    height: '100%',
    marginRight: Spacing.md,
  },
  logInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  logTitle: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  logType: {
    fontSize: fs(11),
    marginTop: 1,
    fontWeight: '500',
  },
  logRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  statusTag: {
    paddingVertical: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  statusTagText: {
    fontSize: fs(10),
    fontWeight: '700',
  },
});
