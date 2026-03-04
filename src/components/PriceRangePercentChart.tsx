import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { DateRange, CarCompany } from '../types';
import { getCurrentCarModelData, carCompanies, getLatestModelPrice } from '../mocks/data';

interface PriceRangePercentChartProps {
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

const PriceRangePercentChart: React.FC<PriceRangePercentChartProps> = ({ className = '', dateRange }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  // 只选择一个车企，默认选择第一个车企
  const [selectedCompany, setSelectedCompany] = useState<CarCompany>(carCompanies[0]);
  
  // 当日期范围或选中的车企变化时，更新图表数据
  useEffect(() => {
    updateChartData();
  }, [dateRange, selectedCompany]);

  // 更新图表数据 - 修改为按月分组统计各价格区间销量百分比
  const updateChartData = () => {
    const carModelData = getCurrentCarModelData(dateRange);
    
    // 按月分组统计各价格区间销量
    const monthlyDataMap = new Map<string, Record<string, number>>();
    
    // 首先按月统计所有数据
    carModelData.forEach(model => {
     // 只处理选中车企的数据
      if (model.manufacturer !== selectedCompany.name) return;
      
      // 使用时间范围内最新的价格作为分类依据
      const latestPrice = getLatestModelPrice(
        carModelData,
        model.manufacturer,
        model.brand,
        model.modelName,
        dateRange
      );
      const price = latestPrice?.minPrice || model.minPrice;
      // 格式化为 "2025.01" 样式的月份
      const monthKey = `${model.year}.${String(parseInt(model.month)).padStart(2, '0')}`;
      
      // 查找价格所在的区间
      const priceRange = PRICE_RANGES.find(range => 
        price >= range.min && price < range.max
      );
      
      if (priceRange) {
        // 初始化月度数据
        if (!monthlyDataMap.has(monthKey)) {
          const monthData: any = { month: monthKey };
          // 初始化所有价格区间的数据为0
          PRICE_RANGES.forEach(range => {
            monthData[range.name] = 0;
          });
          monthlyDataMap.set(monthKey, monthData);
        }
        
        // 更新月度数据
        const monthData = monthlyDataMap.get(monthKey)!;
        monthData[priceRange.name] += model.sales;
      }
    });
    
    // 转换月度数据为数组
    const monthlyData = Array.from(monthlyDataMap.values());
    
    // 按月份排序
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));
    
    // 将销量转换为百分比
    const percentData = monthlyData.map(monthData => {
      const totalSales = Object.values(monthData).reduce((sum: number, value: number) => {
        return typeof value === 'number' ? sum + value : sum;
      }, 0);
      
      const percentMonthData = { month: monthData.month };
      
      PRICE_RANGES.forEach(range => {
        const sales = monthData[range.name] || 0;
        percentMonthData[range.name] = totalSales > 0 ? parseFloat(((sales / totalSales) * 100).toFixed(2)) : 0;
      });
      
      return percentMonthData;
    });
    
    setChartData(percentData);
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{selectedCompany.name}</p>
          {payload.map((entry: any, index: number) => {
            return (
              <p key={index} className="flex items-center mt-1">
                <span 
                  className="w-3 h-3 inline-block mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name}:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  {entry.value}%
                </span>
              </p>
            );
          })}
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

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">价格区间销量百分比分布</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            分析各车企不同价格区间销量占比情况
          </p>
        </div>
        {/* 改为下拉选择器，只能选择一个车企 */}
        <div className="mt-4 md:mt-0 w-full md:w-auto">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            选择车企
          </label>
          <select
            value={selectedCompany.id}
            onChange={(e) => {
              const company = carCompanies.find(c => c.id === e.target.value);
              if (company) {
                setSelectedCompany(company);
              }
            }}
            className="w-full md:w-48 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {carCompanies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[400px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6b7280' }} 
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280' }} 
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `${value}%`}
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
              {PRICE_RANGES.map((range) => (
                <Bar 
                  key={range.name} 
                  dataKey={range.name} 
                  stackId="a"
                  fill={range.color}
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
        <p>注：图表显示{selectedCompany.name}在不同月份、不同价格区间销量占该月总销量的百分比。</p>
      </div>
    </motion.div>
  );
};

export default PriceRangePercentChart;