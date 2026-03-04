import React, { useState, useEffect } from 'react';
import { DateRange } from '../types';

interface DateFilterProps {
  onDateRangeChange: (dateRange: DateRange) => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

const DateFilter: React.FC<DateFilterProps> = ({
  onDateRangeChange,
  defaultStartDate = '2024-12-01',
  defaultEndDate = '2026-02-01'
}) => {
  // 解析默认日期中的年和月
  const parseDate = (dateStr: string): { year: string; month: string } => {
    const parts = dateStr.split('-');
    return {
      year: parts[0] || '2025',
      month: parts[1] || '01'
    };
  };

  // 将年月转换为日期格式 (YYYY-MM-DD)
  const formatToFullDate = (year: string, month: string): string => {
    return `${year}-${month}-01`;
  };

  // 获取当前年份
  const currentYear = new Date().getFullYear();
  
  // 生成年份选项（从2024年到2026年，覆盖数据范围）
  const yearOptions = ['2024', '2025', '2026'];
  
  // 生成月份选项
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    return monthNum < 10 ? `0${monthNum}` : monthNum.toString();
  });

  // 初始化状态
  const startDateParts = parseDate(defaultStartDate);
  const endDateParts = parseDate(defaultEndDate);
  
  const [startYear, setStartYear] = useState<string>(startDateParts.year);
  const [startMonth, setStartMonth] = useState<string>(startDateParts.month);
  const [endYear, setEndYear] = useState<string>(endDateParts.year);
  const [endMonth, setEndMonth] = useState<string>(endDateParts.month);

  // 当组件挂载时，通知父组件日期范围
  useEffect(() => {
    notifyDateRangeChange();
  }, []);

  // 通知父组件日期范围变化
  const notifyDateRangeChange = () => {
    onDateRangeChange({ 
      startDate: formatToFullDate(startYear, startMonth), 
      endDate: formatToFullDate(endYear, endMonth) 
    });
  };

  // 处理开始年份变化
  const handleStartYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStartYear(e.target.value);
  };

  // 处理开始月份变化
  const handleStartMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStartMonth(e.target.value);
  };

  // 处理结束年份变化
  const handleEndYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEndYear(e.target.value);
  };

  // 处理结束月份变化
  const handleEndMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEndMonth(e.target.value);
  };

  // 处理确定按钮点击
  const handleConfirm = () => {
    notifyDateRangeChange();
  };

  return (
    <div className="flex flex-wrap items-center justify-between space-x-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <div className="flex flex-wrap items-center w-full sm:w-auto space-x-4">
        {/* 开始日期选择 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            开始年月:
          </label>
          <div className="flex space-x-2">
            <select
              value={startYear}
              onChange={handleStartYearChange}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map(year => (
                <option key={`start-year-${year}`} value={year}>{year}年</option>
              ))}
            </select>
            <select
              value={startMonth}
              onChange={handleStartMonthChange}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map(month => (
                <option key={`start-month-${month}`} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>

        {/* 结束日期选择 */}
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            结束年月:
          </label>
          <div className="flex space-x-2">
            <select
              value={endYear}
              onChange={handleEndYearChange}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map(year => (
                <option key={`end-year-${year}`} value={year}>{year}年</option>
              ))}
            </select>
            <select
              value={endMonth}
              onChange={handleEndMonthChange}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map(month => (
                <option key={`end-month-${month}`} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* 确定按钮 */}
      <button
        onClick={handleConfirm}
        className="mt-2 sm:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow hover:shadow-md ml-auto sm:ml-0"
      >
        确定
      </button>
    </div>
  );
}

export default DateFilter;