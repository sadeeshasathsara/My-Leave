import { StyleSheet, View, Text, ScrollView, Pressable, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useLeaveStore } from '../storage/store';
import { exportService } from '../services/export';
import { Colors, LeaveTypeColors, Spacing, BorderRadius } from '../constants/theme';
import { LeaveType } from '../types';
import { fs } from '../constants/layout';


export default function ReportsScreen() {
  const systemScheme = useColorScheme();
  
  // Zustand Store
  const leaves = useLeaveStore((state) => state.leaves);
  const settings = useLeaveStore((state) => state.settings);
  const themeSetting = useLeaveStore((state) => state.settings.theme);
  const showToast = useLeaveStore((state) => state.showToast);

  const activeTheme: 'light' | 'dark' = themeSetting === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : (themeSetting === 'dark' ? 'dark' : 'light');
  const colors = Colors[activeTheme];

  // Year comes from the global header dropdown (Zustand)
  const selectedYear = useLeaveStore((state) => state.selectedYear);
  const [exporting, setExporting] = useState<string | null>(null); // 'pdf' | 'excel' | 'print' | null

  // Calculate stats for the selected year
  const selectedYearLeaves = leaves.filter(
    (l) => new Date(l.date).getFullYear() === selectedYear
  );

  const stats = (() => {
    const countByType: Record<LeaveType, number> = {
      Casual: 0,
      Vacation: 0,
      Duty: 0,
      'Half Day': 0,
    };

    let totalTaken = 0;

    selectedYearLeaves.forEach((leave) => {
      totalTaken += leave.type === 'Half Day' ? 0.5 : 1; // counts as 0.5 days
      if (countByType[leave.type] !== undefined) {
        countByType[leave.type] += 1; // counts as 1 entry
      }
    });

    return {
      countByType,
      totalTaken,
      totalLogs: selectedYearLeaves.length,
    };
  })();

  // Handle PDF share
  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await exportService.exportToPDF(leaves, settings, selectedYear);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('cancel') || msg.includes('did not complete')) {
        showToast('Export Canceled', 'The sharing dialog was dismissed.', 'info');
      } else {
        showToast('Export Failed', 'An error occurred while compiling the PDF report.', 'error');
      }
    } finally {
      setExporting(null);
    }
  };

  // Handle PDF direct print
  const handlePrintPDF = async () => {
    setExporting('print');
    try {
      await exportService.printPDF(leaves, settings, selectedYear);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('cancel') || msg.includes('did not complete')) {
        showToast('Print Canceled', 'The print session was closed or canceled.', 'info');
      } else {
        showToast('Print Failed', 'Could not open native print dialog.', 'error');
      }
    } finally {
      setExporting(null);
    }
  };

  // Handle Excel share
  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      await exportService.exportToExcel(leaves, settings, selectedYear);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('cancel') || msg.includes('did not complete')) {
        showToast('Export Canceled', 'The sharing dialog was dismissed.', 'info');
      } else {
        showToast('Export Failed', 'An error occurred while compiling the Excel spreadsheet.', 'error');
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* Year context label */}
        <View style={[styles.yearContextBadge, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}>
          <Ionicons name="calendar" size={14} color={colors.primary} />
          <Text style={[styles.yearContextText, { color: colors.primary }]}>
            Showing data for {selectedYear} (Jan 1 – Dec 31)
          </Text>
        </View>

        {/* HR Readiness Banner */}
        <View style={[styles.bannerCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>HR Submission Ready</Text>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              These reports are structured and formatted to match standard HR/corporate audit criteria.
            </Text>
          </View>
        </View>

        {/* Preview Summary */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Yearly Summary Preview</Text>
        </View>

        <View style={[styles.statsCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statsOverviewRow}>
            <View style={styles.statsOverviewItem}>
              <Text style={[styles.statsNum, { color: colors.text }]}>{stats.totalTaken}</Text>
              <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Total Days</Text>
            </View>
            <View style={[styles.statsDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statsOverviewItem}>
              <Text style={[styles.statsNum, { color: colors.text }]}>{stats.totalLogs}</Text>
              <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Total Log Entries</Text>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.divider }]} />

          {/* Breakdown items */}
          <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>Breakdown by Leave Type</Text>
          <View style={styles.breakdownGrid}>
            {(['Casual', 'Vacation', 'Duty', 'Half Day'] as LeaveType[]).map((type) => {
              const count = stats.countByType[type] || 0;
              const typeColor = LeaveTypeColors[type];
              
              return (
                <View key={type} style={styles.breakdownRow}>
                  <View style={[styles.breakdownLeft, { flex: 1, marginRight: Spacing.sm }]}>
                    <View style={[styles.breakdownDot, { backgroundColor: typeColor }]} />
                    <Text 
                      style={[styles.breakdownText, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {type} Leave
                    </Text>
                  </View>
                  <Text style={[styles.breakdownValue, { color: colors.text, fontWeight: count > 0 ? '700' : '400', flexShrink: 0 }]}>
                    {count} {type === 'Half Day' ? (count === 1 ? 'half day' : 'half days') : (count === 1 ? 'day' : 'days')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Export Actions Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Export & Share Options</Text>
        </View>

        {/* PDF Card */}
        <Pressable 
          style={[styles.exportCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleExportPDF}
          disabled={exporting !== null}
        >
          <View style={[styles.exportIconBox, { backgroundColor: '#ef444415' }]}>
            <Ionicons name="document-text" size={28} color="#ef4444" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={[styles.exportTitle, { color: colors.text }]}>Generate PDF Report</Text>
            <Text style={[styles.exportSubtitle, { color: colors.textMuted }]}>
              Beautiful corporate styling with overview statistics, leave grids, and signature blocks.
            </Text>
          </View>
          <View style={styles.exportActionIcon}>
            {exporting === 'pdf' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
            )}
          </View>
        </Pressable>

        {/* Excel Card */}
        <Pressable 
          style={[styles.exportCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleExportExcel}
          disabled={exporting !== null}
        >
          <View style={[styles.exportIconBox, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="grid" size={26} color="#10b981" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={[styles.exportTitle, { color: colors.text }]}>Export Excel Spreadsheet</Text>
            <Text style={[styles.exportSubtitle, { color: colors.textMuted }]}>
              Exports raw leave logs, date filters, and allocations to a standard .xlsx sheet.
            </Text>
          </View>
          <View style={styles.exportActionIcon}>
            {exporting === 'excel' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
            )}
          </View>
        </Pressable>

        {/* Print PDF Card */}
        <Pressable 
          style={[styles.exportCard, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handlePrintPDF}
          disabled={exporting !== null}
        >
          <View style={[styles.exportIconBox, { backgroundColor: '#3b82f615' }]}>
            <Ionicons name="print" size={26} color="#3b82f6" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={[styles.exportTitle, { color: colors.text }]}>Print Document</Text>
            <Text style={[styles.exportSubtitle, { color: colors.textMuted }]}>
              Triggers the system print popup to instantly print the PDF report via AirPrint / CloudPrint.
            </Text>
          </View>
          <View style={styles.exportActionIcon}>
            {exporting === 'print' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
          </View>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  yearContextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  yearContextText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  bannerCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: fs(11),
    lineHeight: 15,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statsOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xs,
  },
  statsOverviewItem: {
    alignItems: 'center',
  },
  statsNum: {
    fontSize: fs(24),
    fontWeight: '800',
  },
  statsLabel: {
    fontSize: fs(12),
    fontWeight: '500',
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 40,
  },
  cardDivider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  breakdownTitle: {
    fontSize: fs(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  breakdownGrid: {
    gap: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.round,
    marginRight: Spacing.md,
  },
  breakdownText: {
    fontSize: fs(14),
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: fs(14),
  },
  exportCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  exportIconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: 2,
  },
  exportSubtitle: {
    fontSize: fs(11),
    lineHeight: 15,
  },
  exportActionIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
