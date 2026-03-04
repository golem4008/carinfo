import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { DateRange } from '../types';
import DateFilter from '../components/DateFilter';
import { useLocation } from 'react-router-dom';
import PriceRangeSalesChart from '../components/PriceRangeSalesChart';
import PriceRangeComparisonChart from '../components/PriceRangeComparisonChart';
import PriceRangeTable from '../components/PriceRangeTable';
import PriceRangePercentChart from '../components/PriceRangePercentChart';
import ViewSelector from '../components/ViewSelector';

export default function PriceSegmentedSales() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  // 从路由状态中获取日期范围，如果没有则使用默认值
  const initialDateRange = location.state?.dateRange || {
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    // 在实际应用中，这里会根据新的日期范围获取数据
    console.log('Date range changed:', newDateRange);
  };

  // 页面容器动画配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // 头部动画配置
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${theme}`}>
      <motion.div 
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 页面头部 */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          variants={headerVariants}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              车企销量数据分析平台
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              全面分析各车企销量表现、市场份额和增长趋势
            </p>
          </div>
           <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <DateFilter 
             onDateRangeChange={handleDateRangeChange}
             defaultStartDate={dateRange.startDate}
             defaultEndDate={dateRange.endDate}
           />
          <button
            onClick={toggleTheme}
            className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow"
            aria-label="切换主题"
          >
            <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-gray-700 dark:text-gray-300`}></i>
          </button>
        </div>
        </motion.div>

        {/* 视图选择器 */}
        <ViewSelector currentView="price-segmented" dateRange={dateRange} />

        {/* 视图标题 */}
        <motion.div 
          className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fa-solid fa-tag text-green-500 mr-2"></i>
            价格区分销量
          </h2>
        </motion.div>

         {/* 价格区间销量占比 */}
         <PriceRangeSalesChart className="mb-8" dateRange={dateRange} />

         {/* 价格区间与能源类型销量对比 */}
         <PriceRangeComparisonChart className="mb-8" dateRange={dateRange} />
         
         {/* 价格区间销量百分比分布 */}
         <PriceRangePercentChart className="mb-8" dateRange={dateRange} />

        {/* 价格区间销量明细表 */}
        <PriceRangeTable className="mb-8" dateRange={dateRange} />

        {/* 页脚 */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2026 车企销量数据分析平台 | 数据更新时间: {new Date().toLocaleDateString()}
          </p>
        </div>
      </motion.div>
    </div>
  );
}