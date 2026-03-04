import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { MonthlySalesData, CarCompany, DateRange } from '../types';
import { getCurrentMonthlySalesData, formatMonthWithYear, carCompanies } from '../mocks/data';
import CarCompanySelector from './CarCompanySelector';
import { isMainstreamManufacturer } from '../mocks/manufacturerCategories';

interface MonthlyChartProps {
  className?: string;
  dateRange?: DateRange;
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ className = '', dateRange }) => {
  const [selectedCompanies, setSelectedCompanies] = useState<CarCompany[]>(carCompanies);
  const [chartData, setChartData] = useState<any[]>([]);
  // 追踪当前悬停的车企
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);

  // 当选中的车企变化或日期范围变化时，更新图表数据
  useEffect(() => {
    // 获取当前使用的数据
    const currentData = getCurrentMonthlySalesData(dateRange);
    
    // 按年月组合分组数据
    const monthlyDataMap = new Map<string, Record<string, number>>();
    
    // 按年月组合分组数据，并确保包含完整的年份信息
    currentData.forEach(item => {
      // 使用唯一的年月组合作为键，确保不同年份的相同月份不会被合并
      const monthYearKey = `${item.year}-${item.month}`;
      if (!monthlyDataMap.has(monthYearKey)) {
        monthlyDataMap.set(monthYearKey, {
          month: formatMonthWithYear(item.month, item.year),
          year: item.year
        });
      }
    });
    
    // 初始化所有选中公司的数据为0
    Array.from(monthlyDataMap.entries()).forEach(([key, monthData]) => {
      selectedCompanies.forEach(company => {
        if (monthData[company.name] === undefined) {
          monthData[company.name] = 0;
        }
      });
      // 初始化"其他厂商"数据为0
      monthData['其他厂商'] = 0;
    });
    
    // 再遍历一次数据，累加各公司的销量
    // 对于主流厂商且被选中的，单独显示
    // 对于非主流厂商，统一合并到"其他厂商"
    currentData.forEach(item => {
      const monthYearKey = `${item.year}-${item.month}`;
      const monthData = monthlyDataMap.get(monthYearKey)!;
      
      if (isMainstreamManufacturer(item.company) && selectedCompanies.some(company => company.name === item.company)) {
        // 对于主流厂商且被选中的公司，单独累加销量
        monthData[item.company] += item.sales;
      } else {
        // 对于非主流厂商或未被选中的主流厂商，统一合并到"其他厂商"
        monthData['其他厂商'] += item.sales;
      }
    });
    
    // 转换为数组并按年月排序
    const data = Array.from(monthlyDataMap.values()).sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.month.localeCompare(b.month);
    });

    setChartData(data);
  }, [selectedCompanies, dateRange]);

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 处理线条的鼠标进入事件
  const handleBarMouseEnter = (companyName: string) => {
    setHoveredCompany(companyName);
  };

  // 处理线条的鼠标离开事件
  const handleBarMouseLeave = () => {
    setHoveredCompany(null);
  };

  // 处理图表的鼠标离开事件
  const handleChartMouseLeave = () => {
    setHoveredCompany(null);
  };

  // 自定义Tooltip组件
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => {
            // 检查当前条目是否是悬停的车企
            const isHovered = hoveredCompany && entry.name === hoveredCompany;
            
            return (
              <p 
                key={index} 
                className={`flex items-center mt-1 ${isHovered ? 'font-bold' : ''}`}
              >
                <span 
                  className="w-3 h-3 inline-block mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className={`text-sm ${isHovered ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {entry.name}:
                </span>
                <span className={`ml-2 text-sm ${isHovered ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-900 dark:text-white'}`}>
                  {formatNumber(entry.value)} 辆
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">月度销量对比</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            各车企每月销量数据比较，非主流厂商数据统一显示为"其他厂商"
          </p>
        </div>
        <CarCompanySelector 
          onCompanyChange={setSelectedCompanies} 
          initialSelectedCompanies={selectedCompanies}
        />
      </div>
      
	<div className="h-[350px] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
        {chartData.length > 0 ? (
          <div className="min-w-[1500px] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                onMouseLeave={handleChartMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280', fontSize: 12 }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => formatNumber(value)}
                />
      <Tooltip 
        content={<CustomTooltip />} 
        contentStyle={{ pointerEvents: 'none' }}
        offset={100} // 调整偏移量值，根据需要增大或减小
      />
                 {carCompanies.filter(company => isMainstreamManufacturer(company.name)).map((company) => {
                   // 检查公司是否被选中
                   const isSelected = selectedCompanies.some(selected => selected.id === company.id);
                   // 只有选中的公司才会显示数据
                   if (!isSelected) return null;
                   
                    return (
                      <Bar 
                        key={company.id} 
                        dataKey={company.name} 
                        fill={company.color}
                        radius={[4, 4, 0, 0]}
                    barSize={40} // 进一步增加柱子宽度，确保有足够空间显示
                        animationDuration={1500}
                        // 添加鼠标事件处理器
                        onMouseEnter={() => handleBarMouseEnter(company.name)}
                        onMouseLeave={handleBarMouseLeave}
                        style={{ 
                          opacity: hoveredCompany ? (hoveredCompany === company.name ? 1 : 0.6) : 1,
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer'  // 添加指针样式，提升用户体验
                        }}
                      />
                    );
                 })}
                 
                 {/* 添加"其他厂商"柱状图数据 */}
                  {chartData.some(item => item['其他厂商'] > 0) && (
                    <Bar 
                      key="other-company" 
                      dataKey="其他厂商" 
                      fill="#8884d8"
                      radius={[4, 4, 0, 0]}
                    barSize={40} // 进一步增加柱子宽度，确保有足够空间显示
                      animationDuration={1500}
                      onMouseEnter={() => handleBarMouseEnter('其他厂商')}
                      onMouseLeave={handleBarMouseLeave}
                      style={{ 
                        opacity: hoveredCompany ? (hoveredCompany === '其他厂商' ? 1 : 0.6) : 1,
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer'
                      }}
                    />
                  )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">请选择车企查看销量数据</p>
          </div>
        )}
      </div>
      
      {/* 固定图例 - 放在滚动容器之外 */}
      {chartData.length > 0 && (
        <div className="mt-4 flex justify-center flex-wrap gap-4">
           {selectedCompanies.filter(company => isMainstreamManufacturer(company.name)).map((company) => (
             <div 
               key={company.id} 
               className="flex items-center"
               onMouseEnter={() => handleBarMouseEnter(company.name)}
               onMouseLeave={handleBarMouseLeave}
             >
               <span 
                 className="w-3 h-3 inline-block mr-2" 
                 style={{ backgroundColor: company.color }}
               ></span>
               <span className={`text-sm ${hoveredCompany === company.name ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                 {company.name}
               </span>
             </div>
           ))}
           
           {/* 添加"其他厂商"图例 */}
           {chartData.some(item => item['其他厂商'] > 0) && (
             <div 
               className="flex items-center"
               onMouseEnter={() => handleBarMouseEnter('其他厂商')}
               onMouseLeave={handleBarMouseLeave}
             >
               <span 
                 className="w-3 h-3 inline-block mr-2" 
                 style={{ backgroundColor: '#8884d8' }}
               ></span>
               <span className={`text-sm ${hoveredCompany === '其他厂商' ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                 其他厂商
               </span>
             </div>
           )}
        </div>
      )}
      
      {/* 滚动提示 */}
      {chartData.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>左右滑动可查看更多数据</span>
          <div className="flex items-center">
            <i className="fa-solid fa-hand-point-left mr-1"></i>
            <i className="fa-solid fa-hand-point-right"></i>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MonthlyChart;