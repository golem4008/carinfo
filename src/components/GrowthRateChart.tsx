import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import { CarCompany, DateRange } from '../types';
import { getGrowthRateData, formatMonthWithYear } from '../mocks/data';
import CarCompanySelector from './CarCompanySelector';

interface GrowthRateChartProps {
  className?: string;
  dateRange?: DateRange;
}

const GrowthRateChart: React.FC<GrowthRateChartProps> = ({ className = '', dateRange }) => {
  const [selectedCompanies, setSelectedCompanies] = useState<CarCompany[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CarCompany | null>(null);

  // 当选中的车企变化时，更新选中的单个车企
  useEffect(() => {
    if (selectedCompanies.length > 0) {
      // 保持选中的公司顺序稳定
      if (selectedCompany && selectedCompanies.some(c => c.id === selectedCompany.id)) {
        // 如果之前选中的公司仍然在选中列表中，保持不变
        return;
      }
      // 否则选择第一个选中的公司
      setSelectedCompany(selectedCompanies[0]);
    }
  }, [selectedCompanies, selectedCompany]);

  // 当选中的单个车企变化或日期范围变化时，更新图表数据
  useEffect(() => {
    if (!selectedCompany) return;

    const growthData = getGrowthRateData(dateRange);
    const filteredData = growthData
      .filter(item => item.company === selectedCompany.name)
      .map(item => ({
        month: formatMonthWithYear(item.month, item.year),
        同比增长: item.yoyGrowth,
        环比增长: item.momGrowth
      }));

    setChartData(filteredData);
  }, [selectedCompany, dateRange]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => {
            const isPositive = entry.value > 0;
            return (
              <p 
                key={index} 
                className={`flex items-center mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}
              >
                <span 
                  className="w-3 h-3 inline-block mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name}:</span>
                <span className="ml-2 text-sm font-medium">
                  {isPositive ? '+' : ''}{entry.value}%
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">增长率分析</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedCompany ? `${selectedCompany.name}` : '选中车企'}的同比和环比增长情况
          </p>
        </div>
        <CarCompanySelector 
          onCompanyChange={setSelectedCompanies} 
          initialSelectedCompanies={selectedCompanies}
        />
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
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}%`}
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
              <ReferenceLine y={0} stroke="#888888" />
              <Bar 
                dataKey="同比增长" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              />
              <Bar 
                dataKey="环比增长" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">请选择车企查看增长率数据</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GrowthRateChart;