import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { DateRange } from '../types';
import { getCurrentCarModelData, getLatestModelPrice } from '../mocks/data';

interface PriceRangeComparisonChartProps {
  className?: string;
  dateRange?: DateRange;
}

// 定义价格区间
const PRICE_RANGES = [
  { name: '10万以下', min: 0, max: 10, color: '#3b82f6' },
  { name: '10~15万', min: 10, max: 15, color: '#10b981' },
  { name: '15~25万', min: 15, max: 25, color: '#f59e0b' },
  { name: '25~35万', min: 25, max: 35, color: '#8b5cf6' },
  { name: '35~50万', min: 35, max: 50, color: '#ec4899' },
  { name: '50万以上', min: 50, max: Infinity, color: '#ef4444' }
];

// 导入能源类型配置
import { energyTypes, getEnergyTypeNames } from '../mocks/energyTypes';

const PriceRangeComparisonChart: React.FC<PriceRangeComparisonChartProps> = ({ className = '', dateRange }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  // 获取能源类型名称列表
  const energyTypeNames = getEnergyTypeNames();

  // 当日期范围变化时，更新图表数据
  useEffect(() => {
    updateChartData();
  }, [dateRange]);

  // 更新图表数据
  const updateChartData = () => {
    const carModelData = getCurrentCarModelData(dateRange);
    
  // 按价格区间和能源类型统计销量
  const data: Record<string, Record<string, number>> = {};
  
  // 不需要在这里重新定义，已经在组件顶层定义
  
  // 初始化数据结构
  PRICE_RANGES.forEach(range => {
    data[range.name] = {};
    energyTypeNames.forEach(type => {
      data[range.name][type] = 0;
    });
  });

     // 统计销量
    carModelData.forEach(model => {
      // 使用时间范围内最新的价格作为分类依据
      const latestPrice = getLatestModelPrice(
        carModelData,
        model.manufacturer,
        model.brand,
        model.modelName,
        dateRange
      );
      const price = latestPrice?.minPrice || model.minPrice;
      
       // 查找价格所在的区间
      const priceRange = PRICE_RANGES.find(range => 
        price >= range.min && price < range.max
      );
      
      if (priceRange && energyTypeNames.includes(model.energyType)) {
        data[priceRange.name][model.energyType] += model.sales;
      }
    });

    // 转换为图表所需的数据格式
    const formattedData = PRICE_RANGES.map(range => ({
      name: range.name,
      ...data[range.name]
    }));

    setChartData(formattedData);
  };

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center mt-1">
              <span 
                className="w-3 h-3 inline-block mr-2" 
                style={{ backgroundColor: entry.color }}
              ></span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name}:</span>
              <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                {formatNumber(entry.value)} 辆
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 图表动画配置
  const chartVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
  };

  // 从配置中构建能源类型颜色映射
  // 确保energyTypeNames在整个组件中可用
  const energyTypeColors: Record<string, string> = {};
  energyTypes.forEach(type => {
    energyTypeColors[type.name] = type.color;
  });

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">价格区间与能源类型销量对比</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          各价格区间内不同能源类型车辆的销量对比
        </p>
      </div>

      <div className="h-[400px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barGap={0}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6b7280' }} 
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280' }} 
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => formatNumber(value)}
              />
      <Tooltip 
        content={<CustomTooltip />} 
        contentStyle={{ pointerEvents: 'none' }}
         offset={100} // 调整偏移量值为100
      />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
              />
               {energyTypeNames.map((type) => (
                <Bar 
                  key={type} 
                  dataKey={type} 
                  fill={energyTypeColors[type]}
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
          </div>
        )}
      </div>

      {/* 说明信息 */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>注：数据基于各车型最低价格进行分类统计。</p>
      </div>
    </motion.div>
  );
};

export default PriceRangeComparisonChart;