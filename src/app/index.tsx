import { StyleSheet, View, Text, ScrollView, Pressable, useColorScheme, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useCallback } from 'react';
import { useLeaveStore } from '../storage/store';
import { Colors, LeaveTypeColors, Spacing, BorderRadius } from '../constants/theme';
import { LeaveRecord } from '../types';
import { fs } from '../constants/layout';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DashboardScreen() {
  const systemScheme = useColorScheme();

  // Store state
  const leaves = useLeaveStore((state) => state.leaves);
  const settings = useLeaveStore((state) => state.settings);
  const getStats = useLeaveStore((state) => state.getStats);
  const getMonthStats = useLeaveStore((state) => state.getMonthStats);
  const loadInitialData = useLeaveStore((state) => state.loadInitialData);
  const themeSetting = useLeaveStore((state) => state.settings.theme);
  const setAddLeaveModalOpen = useLeaveStore((state) => state.setAddLeaveModalOpen);
  const selectedYear = useLeaveStore((state) => state.selectedYear);

  const activeTheme: 'light' | 'dark' = themeSetting === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : (themeSetting === 'dark' ? 'dark' : 'light');
  const colors = Colors[activeTheme];

  // Current month for the 3 summary cards
  const today = new Date();
  const currentMonth = today.getMonth();    // 0-indexed
  const currentYear = today.getFullYear();
  const currentMonthName = MONTH_NAMES[currentMonth];

  // 3 cards: current month breakdown (always current calendar month, regardless of selected year)
  const monthStats = getMonthStats(currentYear, currentMonth);

  // Yearly summary card: uses the globally selected year
  const yearlyStats = getStats(selectedYear);

  // Recent leave entries (4 most recent, across all time)
  const recentLeaves = leaves.slice(0, 4);

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialData();
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: Spacing.md }}>
            <Text style={[styles.greeting, { color: colors.textMuted }]} numberOfLines={1}>Welcome back,</Text>
            <Text
              style={[styles.username, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {settings.userName}
            </Text>
          </View>
          <Pressable
            style={[styles.profileButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="person" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* This-month subtitle */}
        <Text style={[styles.monthSubtitle, { color: colors.textMuted }]}>
          Leaves in {currentMonthName}
        </Text>

        {/* 3 Summary Cards — current month */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: LeaveTypeColors.Casual + '15' }]}>
              <Ionicons name="calendar-outline" size={18} color={LeaveTypeColors.Casual} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {monthStats.Casual}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
              Casual
            </Text>
          </View>

          <View style={[styles.summaryCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: LeaveTypeColors.Vacation + '15' }]}>
              <Ionicons name="airplane-outline" size={18} color={LeaveTypeColors.Vacation} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {monthStats.Vacation}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
              Vacation
            </Text>
          </View>

          <View style={[styles.summaryCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: LeaveTypeColors.Duty + '15' }]}>
              <Ionicons name="briefcase-outline" size={18} color={LeaveTypeColors.Duty} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {monthStats.Duty}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
              Duty
            </Text>
          </View>
        </View>

        {/* Yearly Summary Card — tied to selectedYear from top bar */}
        <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{selectedYear} Summary</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Total days logged for {selectedYear} (Jan – Dec)
          </Text>

          <View style={styles.statsListContainer}>
            <View style={[styles.statsRow, { borderBottomColor: colors.divider }]}>
              <View style={styles.statsRowLeft}>
                <View style={[styles.typeDot, { backgroundColor: LeaveTypeColors.Casual }]} />
                <Text style={[styles.statsLabel, { color: colors.text }]}>Casual Leave</Text>
              </View>
              <Text style={[styles.statsValue, { color: colors.text }]}>
                {yearlyStats.byType.Casual || 0} {yearlyStats.byType.Casual === 1 ? 'day' : 'days'}
              </Text>
            </View>

            <View style={[styles.statsRow, { borderBottomColor: colors.divider }]}>
              <View style={styles.statsRowLeft}>
                <View style={[styles.typeDot, { backgroundColor: LeaveTypeColors.Vacation }]} />
                <Text style={[styles.statsLabel, { color: colors.text }]}>Vacation Leave</Text>
              </View>
              <Text style={[styles.statsValue, { color: colors.text }]}>
                {yearlyStats.byType.Vacation || 0} {yearlyStats.byType.Vacation === 1 ? 'day' : 'days'}
              </Text>
            </View>

            <View style={[styles.statsRow, { borderBottomColor: 'transparent' }]}>
              <View style={styles.statsRowLeft}>
                <View style={[styles.typeDot, { backgroundColor: LeaveTypeColors.Duty }]} />
                <Text style={[styles.statsLabel, { color: colors.text }]}>Duty Leave</Text>
              </View>
              <Text style={[styles.statsValue, { color: colors.text }]}>
                {yearlyStats.byType.Duty || 0} {yearlyStats.byType.Duty === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </View>

          {/* Total footer */}
          <View style={[styles.totalRow, { borderTopColor: colors.divider, backgroundColor: colors.primary + '08' }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {yearlyStats.totalTakenThisYear} {yearlyStats.totalTakenThisYear === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Pressable
            style={[styles.actionButton, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setAddLeaveModalOpen(true, null)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#6366f115' }]}>
              <Ionicons name="add" size={22} color="#6366f1" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Add Leave</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/calendar')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#f59e0b15' }]}>
              <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Calendar</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/reports')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10b98115' }]}>
              <Ionicons name="document-text-outline" size={20} color="#10b981" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Reports</Text>
          </Pressable>
        </View>

        {/* Recent Leave Entries */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Log Entries</Text>
          {leaves.length > 0 && (
            <Pressable onPress={() => router.push('/calendar')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            </Pressable>
          )}
        </View>

        {recentLeaves.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No records found</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              You haven't logged any leave requests yet.
            </Text>
            <Pressable
              style={[styles.createFirstBtn, { backgroundColor: colors.primary }]}
              onPress={() => setAddLeaveModalOpen(true, null)}
            >
              <Text style={styles.createFirstBtnText}>Record First Leave</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {recentLeaves.map((leave: LeaveRecord) => {
              const typeColor = LeaveTypeColors[leave.type] || colors.textMuted;

              return (
                <Pressable
                  key={leave.id}
                  style={[styles.entryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setAddLeaveModalOpen(true, leave.id)}
                >
                  <View style={styles.entryLeft}>
                    <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />
                    <View style={styles.entryDetails}>
                      <Text style={[styles.entryTitleText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {leave.reason}
                      </Text>
                      <Text style={[styles.entryDateText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {formatDate(leave.date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.entryRight}>
                    <View style={[styles.statusBadge, { backgroundColor: typeColor + '15' }]}>
                      <Text style={[styles.statusText, { color: typeColor }]} numberOfLines={1}>
                        {leave.type}
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
  safeArea: { flex: 1 },
  scrollContainer: { padding: Spacing.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  greeting: { fontSize: fs(13), fontWeight: '500' },
  username: { fontSize: fs(24), fontWeight: '800', marginTop: 2 },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  monthSubtitle: {
    fontSize: fs(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryValue: { fontSize: fs(18), fontWeight: '700', marginBottom: 2 },
  summaryLabel: { fontSize: fs(11), fontWeight: '500' },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  cardTitle: { fontSize: fs(18), fontWeight: '700', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  cardSubtitle: { fontSize: fs(12), marginTop: 2, marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  statsListContainer: { flexDirection: 'column', paddingHorizontal: Spacing.lg },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  statsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  typeDot: { width: 10, height: 10, borderRadius: BorderRadius.round },
  statsLabel: { fontSize: fs(14), fontWeight: '600' },
  statsValue: { fontSize: fs(14), fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: fs(13), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  totalValue: { fontSize: fs(16), fontWeight: '800' },
  quickActionsContainer: { flexDirection: 'column', gap: Spacing.md, marginBottom: Spacing.xxl },
  actionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  actionIcon: { width: 38, height: 38, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: fs(14), fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: fs(18), fontWeight: '700' },
  seeAllText: { fontSize: fs(13), fontWeight: '600' },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIcon: { marginBottom: Spacing.md },
  emptyTitle: { fontSize: fs(16), fontWeight: '600', marginBottom: Spacing.xs },
  emptyText: { fontSize: fs(13), textAlign: 'center', marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  createFirstBtn: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md },
  createFirstBtnText: { color: '#ffffff', fontSize: fs(14), fontWeight: '600' },
  entriesList: { gap: Spacing.sm },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  entryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeIndicator: { width: 10, height: 10, borderRadius: BorderRadius.round, marginRight: Spacing.md },
  entryDetails: { flex: 1, paddingRight: Spacing.sm },
  entryTitleText: { fontSize: fs(14), fontWeight: '600' },
  entryDateText: { fontSize: fs(11), marginTop: 2 },
  entryRight: { alignItems: 'flex-end', flexShrink: 0 },
  statusBadge: { paddingVertical: 2, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, marginTop: Spacing.xs },
  statusText: { fontSize: fs(9), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
