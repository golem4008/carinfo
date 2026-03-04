import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatNumber } from '../lib/utils';
import { 
  getTotalSales, 
  getAverageMonthlySales, 
  getYoYGrowth 
} from '../mocks/data';
import { DateRange } from '../types';

interface SalesOverviewProps {
  className?: string;
  dateRange?: DateRange;
}

const SalesOverview: React.FC<SalesOverviewProps> = ({ className = '', dateRange }) => {
  const [stats, setStats] = useState({
    totalSales: 0,
    averageMonthlySales: 0,
    yoYGrowth: 0,
  });

  // 当日期范围变化时，更新统计数据
  useEffect(() => {
    setStats({
      totalSales: getTotalSales(dateRange),
      averageMonthlySales: getAverageMonthlySales(dateRange),
      yoYGrowth: getYoYGrowth(dateRange),
    });
  }, [dateRange]);

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 卡片数据
  const cardsData = [
    {
      title: '总销量',
      value: stats.totalSales,
      formatValue: (val: number) => `${formatNumber(val)} 辆`,
      icon: 'fa-car',
      color: 'bg-blue-500',
    },
    {
      title: '月度平均销量',
      value: stats.averageMonthlySales,
      formatValue: (val: number) => `${formatNumber(val)} 辆`,
      icon: 'fa-chart-simple',
      color: 'bg-green-500',
    },
    {
      title: '同比增长',
      value: stats.yoYGrowth,
      formatValue: (val: number) => `${val > 0 ? '+' : ''}${val}%`,
      icon: 'fa-arrow-trend-up',
      color: 'bg-purple-500',
      isPositive: stats.yoYGrowth > 0,
    },
  ];

  // 卡片动画配置
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {cardsData.map((card, index) => (
        <motion.div
          key={index}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {card.title}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.formatValue(card.value)}
              </h3>
              {card.isPositive !== undefined && (
                <p className={`text-xs mt-1 ${card.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  <i className={`fa-solid ${card.isPositive ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                  相比去年同期
                </p>
              )}
            </div>
            <div className={`${card.color} p-3 rounded-lg text-white`}>
              <i className={`fa-solid ${card.icon} text-xl`}></i>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default SalesOverview;