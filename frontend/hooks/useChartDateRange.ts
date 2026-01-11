import { useMemo } from 'react';
import { subDays, subMonths, startOfWeek, startOfMonth, addDays } from 'date-fns';

export type Period = '1week' | '1month' | '6months' | '1year';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate date range for chart display based on period and offset
 */
export function useChartDateRange(period: Period, weekOffset: number): DateRange {
  return useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case '1week':
        // 1週間チャート：weekOffsetに基づいて表示する週を決定
        const weekTargetStart = startOfWeek(subDays(now, weekOffset * 7), { weekStartsOn: 0 });
        startDate = weekTargetStart;
        endDate = addDays(weekTargetStart, 6); // 週の終わり（土曜日）
        break;
      case '1month':
        // 1か月チャート：weekOffsetに基づいて表示する5週間を決定
        // weekOffset = 0: 現在の週を含む5週間
        // weekOffset = 1: 1か月前の週を含む5週間
        // 1か月 = 約4週間なので、weekOffset * 4週間分移動
        const monthCurrentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
        const monthTargetWeekStart = startOfWeek(subDays(monthCurrentWeekStart, weekOffset * 4 * 7), { weekStartsOn: 0 });
        startDate = monthTargetWeekStart;
        endDate = addDays(monthTargetWeekStart, 34); // 5週間分（35日 - 1日 = 34日後）
        break;
      case '6months':
        // 半年チャート：weekOffsetに基づいて表示する6か月を決定
        // weekOffset = 0: 現在の月から過去6か月
        // weekOffset = 1: 6か月前からさらに6か月前（12か月前から6か月前まで）
        const sixMonthsEndMonth = weekOffset === 0 ? now : subMonths(now, weekOffset * 6);
        const sixMonthsStartMonth = subMonths(sixMonthsEndMonth, 6);
        startDate = startOfMonth(sixMonthsStartMonth);
        endDate = addDays(startOfMonth(sixMonthsEndMonth), -1); // 終了月の前日まで
        break;
      case '1year':
        // 1年チャート：weekOffsetに基づいて表示する1年を決定
        // weekOffset = 0: 現在の月から過去1年
        // weekOffset = 1: 1年前からさらに1年前（2年前から1年前まで）
        const oneYearEndMonth = weekOffset === 0 ? now : subMonths(now, weekOffset * 12);
        const oneYearStartMonth = subMonths(oneYearEndMonth, 12);
        startDate = startOfMonth(oneYearStartMonth);
        endDate = addDays(startOfMonth(oneYearEndMonth), -1); // 終了月の前日まで
        break;
    }

    return { startDate, endDate };
  }, [period, weekOffset]);
}



