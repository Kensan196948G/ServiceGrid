import {
  formatDateJp,
  formatDateTimeJp,
  formatRelativeTime,
  isoToJpDate,
  isoToJpDateTime,
  getTodayString,
  getDaysAgo,
  getDaysFromNow,
  isToday,
  isPast,
  isFuture,
  getDaysDifference,
  getBusinessDays,
  getStartOfMonth,
  getEndOfMonth,
  isValidDate
} from '../dateUtils';

describe('dateUtils', () => {
  // 固定の基準時刻を設定
  const mockDate = new Date('2023-12-15T10:30:00.000Z');
  
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('formatDateJp', () => {
    it('Dateオブジェクトを日本語形式でフォーマットする', () => {
      const date = new Date('2023-12-15');
      const result = formatDateJp(date);
      expect(result).toBe('2023/12/15');
    });

    it('ISO文字列を日本語形式でフォーマットする', () => {
      const isoString = '2023-12-15T10:30:00.000Z';
      const result = formatDateJp(isoString);
      expect(result).toBe('2023/12/15');
    });

    it('無効な日付の場合は無効な日付を返す', () => {
      const result = formatDateJp('invalid-date');
      expect(result).toBe('無効な日付');
    });
  });

  describe('formatDateTimeJp', () => {
    it('Dateオブジェクトを日本語日時形式でフォーマットする', () => {
      const date = new Date('2023-12-15T10:30:45.000Z');
      const result = formatDateTimeJp(date);
      expect(result).toBe('2023/12/15 19:30:45'); // JST
    });

    it('ISO文字列を日本語日時形式でフォーマットする', () => {
      const isoString = '2023-12-15T10:30:45.000Z';
      const result = formatDateTimeJp(isoString);
      expect(result).toBe('2023/12/15 19:30:45'); // JST
    });

    it('無効な日時の場合は無効な日時を返す', () => {
      const result = formatDateTimeJp('invalid-date');
      expect(result).toBe('無効な日時');
    });
  });

  describe('formatRelativeTime', () => {
    it('数秒前を正しく表示する', () => {
      const pastDate = new Date(mockDate.getTime() - 30 * 1000); // 30秒前
      const result = formatRelativeTime(pastDate);
      expect(result).toBe('30秒前');
    });

    it('数分前を正しく表示する', () => {
      const pastDate = new Date(mockDate.getTime() - 5 * 60 * 1000); // 5分前
      const result = formatRelativeTime(pastDate);
      expect(result).toBe('5分前');
    });

    it('数時間前を正しく表示する', () => {
      const pastDate = new Date(mockDate.getTime() - 3 * 60 * 60 * 1000); // 3時間前
      const result = formatRelativeTime(pastDate);
      expect(result).toBe('3時間前');
    });

    it('数日前を正しく表示する', () => {
      const pastDate = new Date(mockDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2日前
      const result = formatRelativeTime(pastDate);
      expect(result).toBe('2日前');
    });

    it('数週間前を正しく表示する', () => {
      const pastDate = new Date(mockDate.getTime() - 14 * 24 * 60 * 60 * 1000); // 14日前
      const result = formatRelativeTime(pastDate);
      expect(result).toBe('2週間前');
    });

    it('無効な日付の場合は無効な日付を返す', () => {
      const result = formatRelativeTime('invalid-date');
      expect(result).toBe('無効な日付');
    });
  });

  describe('isoToJpDate', () => {
    it('ISO文字列を日本語日付に変換する', () => {
      const isoString = '2023-12-15T10:30:00.000Z';
      const result = isoToJpDate(isoString);
      expect(result).toBe('2023/12/15');
    });

    it('無効なISO文字列の場合は無効な日付を返す', () => {
      const result = isoToJpDate('invalid-iso');
      expect(result).toBe('無効な日付');
    });
  });

  describe('isoToJpDateTime', () => {
    it('ISO文字列を日本語日時に変換する', () => {
      const isoString = '2023-12-15T10:30:45.000Z';
      const result = isoToJpDateTime(isoString);
      expect(result).toBe('2023/12/15 19:30:45');
    });

    it('無効なISO文字列の場合は無効な日時を返す', () => {
      const result = isoToJpDateTime('invalid-iso');
      expect(result).toBe('無効な日時');
    });
  });

  describe('getTodayString', () => {
    it('今日の日付をYYYY-MM-DD形式で返す', () => {
      const result = getTodayString();
      expect(result).toBe('2023-12-15');
    });
  });

  describe('getDaysAgo', () => {
    it('指定日数前の日付を返す', () => {
      const result = getDaysAgo(5);
      const expected = new Date('2023-12-10T10:30:00.000Z');
      expect(result.toDateString()).toBe(expected.toDateString());
    });
  });

  describe('getDaysFromNow', () => {
    it('指定日数後の日付を返す', () => {
      const result = getDaysFromNow(5);
      const expected = new Date('2023-12-20T10:30:00.000Z');
      expect(result.toDateString()).toBe(expected.toDateString());
    });
  });

  describe('isToday', () => {
    it('今日の日付に対してtrueを返す', () => {
      const today = new Date(mockDate);
      const result = isToday(today);
      expect(result).toBe(true);
    });

    it('今日以外の日付に対してfalseを返す', () => {
      const yesterday = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000);
      const result = isToday(yesterday);
      expect(result).toBe(false);
    });

    it('無効な日付に対してfalseを返す', () => {
      const result = isToday('invalid-date');
      expect(result).toBe(false);
    });
  });

  describe('isPast', () => {
    it('過去の日付に対してtrueを返す', () => {
      const pastDate = new Date(mockDate.getTime() - 1000);
      const result = isPast(pastDate);
      expect(result).toBe(true);
    });

    it('未来の日付に対してfalseを返す', () => {
      const futureDate = new Date(mockDate.getTime() + 1000);
      const result = isPast(futureDate);
      expect(result).toBe(false);
    });

    it('無効な日付に対してfalseを返す', () => {
      const result = isPast('invalid-date');
      expect(result).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('未来の日付に対してtrueを返す', () => {
      const futureDate = new Date(mockDate.getTime() + 1000);
      const result = isFuture(futureDate);
      expect(result).toBe(true);
    });

    it('過去の日付に対してfalseを返す', () => {
      const pastDate = new Date(mockDate.getTime() - 1000);
      const result = isFuture(pastDate);
      expect(result).toBe(false);
    });

    it('無効な日付に対してfalseを返す', () => {
      const result = isFuture('invalid-date');
      expect(result).toBe(false);
    });
  });

  describe('getDaysDifference', () => {
    it('二つの日付の差を日数で返す', () => {
      const date1 = new Date('2023-12-10');
      const date2 = new Date('2023-12-15');
      const result = getDaysDifference(date1, date2);
      expect(result).toBe(5);
    });

    it('日付の順序に関係なく差を返す', () => {
      const date1 = new Date('2023-12-15');
      const date2 = new Date('2023-12-10');
      const result = getDaysDifference(date1, date2);
      expect(result).toBe(5);
    });

    it('無効な日付の場合は0を返す', () => {
      const result = getDaysDifference('invalid-date', '2023-12-15');
      expect(result).toBe(0);
    });
  });

  describe('getBusinessDays', () => {
    it('営業日を正しく計算する（平日のみ）', () => {
      // 2023-12-11（月）から2023-12-15（金）まで
      const startDate = new Date('2023-12-11');
      const endDate = new Date('2023-12-15');
      const result = getBusinessDays(startDate, endDate);
      expect(result).toBe(5); // 月〜金の5日間
    });

    it('週末を除いた営業日を計算する', () => {
      // 2023-12-08（金）から2023-12-12（火）まで
      const startDate = new Date('2023-12-08');
      const endDate = new Date('2023-12-12');
      const result = getBusinessDays(startDate, endDate);
      expect(result).toBe(3); // 金、月、火の3日間
    });

    it('無効な日付の場合は0を返す', () => {
      const result = getBusinessDays('invalid-date', '2023-12-15');
      expect(result).toBe(0);
    });
  });

  describe('getStartOfMonth', () => {
    it('月の最初の日を返す', () => {
      const date = new Date('2023-12-15');
      const result = getStartOfMonth(date);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(11); // 12月（0ベース）
      expect(result.getFullYear()).toBe(2023);
    });

    it('無効な日付の場合は現在日時を返す', () => {
      const result = getStartOfMonth('invalid-date');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('getEndOfMonth', () => {
    it('月の最後の日を返す', () => {
      const date = new Date('2023-12-15');
      const result = getEndOfMonth(date);
      expect(result.getDate()).toBe(31); // 12月は31日まで
      expect(result.getMonth()).toBe(11); // 12月（0ベース）
      expect(result.getFullYear()).toBe(2023);
    });

    it('2月の最後の日を正しく返す（平年）', () => {
      const date = new Date('2023-02-15');
      const result = getEndOfMonth(date);
      expect(result.getDate()).toBe(28); // 2023年2月は28日まで
    });

    it('無効な日付の場合は現在日時を返す', () => {
      const result = getEndOfMonth('invalid-date');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('isValidDate', () => {
    it('有効なDateオブジェクトに対してtrueを返す', () => {
      const validDate = new Date('2023-12-15');
      const result = isValidDate(validDate);
      expect(result).toBe(true);
    });

    it('有効な日付文字列に対してtrueを返す', () => {
      const validDateString = '2023-12-15';
      const result = isValidDate(validDateString);
      expect(result).toBe(true);
    });

    it('無効なDateオブジェクトに対してfalseを返す', () => {
      const invalidDate = new Date('invalid-date');
      const result = isValidDate(invalidDate);
      expect(result).toBe(false);
    });

    it('無効な日付文字列に対してfalseを返す', () => {
      const invalidDateString = 'not-a-date';
      const result = isValidDate(invalidDateString);
      expect(result).toBe(false);
    });

    it('数値に対してfalseを返す', () => {
      const result = isValidDate(123);
      expect(result).toBe(false);
    });

    it('nullに対してfalseを返す', () => {
      const result = isValidDate(null);
      expect(result).toBe(false);
    });

    it('undefinedに対してfalseを返す', () => {
      const result = isValidDate(undefined);
      expect(result).toBe(false);
    });
  });
});