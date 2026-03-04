import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import { motion } from 'framer-motion';
import { CarCompany, DateRange } from '../types';
import { formatMonthWithYear, getCurrentMonthlySalesData, carCompanies } from '../mocks/data';
import { isMainstreamManufacturer } from '../mocks/manufacturerCategories';
import CarCompanySelector from './CarCompanySelector';

interface SalesTrendChartProps {
  className?: string;
  dateRange?: DateRange;
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ className = '', dateRange }) => {
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
    currentData.forEach(item => {
      const monthYearKey = `${item.year}-${item.month}`;
      const monthData = monthlyDataMap.get(monthYearKey)!;
      
      // 检查公司是否为主流厂商
      if (isMainstreamManufacturer(item.company)) {
        // 对于主流厂商，如果被选中则单独显示，否则不显示
        if (selectedCompanies.some(company => company.name === item.company)) {
          monthData[item.company] += item.sales;
        }
      } else {
        // 对于非主流厂商，无论是否被选中，都合并到"其他厂商"
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
  const handleLineMouseEnter = (companyName: string) => {
    setHoveredCompany(companyName);
  };

  // 处理线条的鼠标离开事件
  const handleLineMouseLeave = () => {
    setHoveredCompany(null);
  };

  // 处理图表的鼠标离开事件
  const handleChartMouseLeave = () => {
    setHoveredCompany(null);
  };

  // 自定义Tooltip组件
  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">销量趋势分析</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            各主流车企销量月度变化趋势，非主流厂商统一显示为"其他厂商"
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
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onMouseLeave={handleChartMouseLeave}
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
                tickFormatter={(value) => formatNumber(value)}
              />
    <Tooltip 
      content={<CustomTooltip />} 
      contentStyle={{ pointerEvents: 'none' }}
       offset={100} // 调整偏移量值为100
    />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className={`text-sm ${hoveredCompany === value ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>}
              />
                 {/* 只显示主流厂商和"其他厂商"的数据，过滤掉非主流厂商 */}
                 {carCompanies
                   .filter(company => isMainstreamManufacturer(company.name))
                   .map((company) => {
                     // 检查公司是否被选中
                     const isSelected = selectedCompanies.some(selected => selected.id === company.id);
                     // 只有选中的公司才会显示数据
                     if (!isSelected) return null;
                     
                     return (
                      <Line 
                        key={company.id} 
                        type="monotone" 
                        dataKey={company.name} 
                        stroke={company.color}
                        strokeWidth={hoveredCompany === company.name ? 4 : 2}
                        dot={{ 
                          fill: company.color, 
                          r: hoveredCompany === company.name ? 6 : 4,
                          stroke: hoveredCompany === company.name ? company.color : 'none',
                          strokeWidth: 2
                        }}
                        activeDot={{ 
                          r: 8,  // 减小activeDot的半径，使放大效果更适度
                          stroke: '#fff', 
                          strokeWidth: 2 
                        }}
                        animationDuration={1500}
                        // 添加鼠标事件处理器
                        onMouseEnter={() => handleLineMouseEnter(company.name)}
                        onMouseLeave={handleLineMouseLeave}
                        style={{ 
                          opacity: hoveredCompany ? (hoveredCompany === company.name ? 1 : 0.4) : 1,
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer'  // 添加指针样式，提升用户体验
                        }}
                        isAnimationActive={true}
                      />
                     );
                   })}
                 
                 {/* 添加"其他厂商"折线图数据 */}
                 {/* 只要chartData有数据，就显示"其他厂商"的折线 */}
                 {chartData.length > 0 && (
                   <Line 
                     key="other-company"
                     type="monotone" 
                     dataKey="其他厂商" 
                     stroke="#8884d8"
                     strokeWidth={hoveredCompany === '其他厂商' ? 4 : 2}
                     dot={{ 
                       fill: '#8884d8', 
                       r: hoveredCompany === '其他厂商' ? 6 : 4,
                       stroke: hoveredCompany === '其他厂商' ? '#8884d8' : 'none',
                       strokeWidth: 2
                     }}
                     activeDot={{ 
                       r: 8,
                       stroke: '#fff', 
                       strokeWidth: 2 
                     }}
                     animationDuration={1500}
                     onMouseEnter={() => handleLineMouseEnter('其他厂商')}
                     onMouseLeave={handleLineMouseLeave}
                     style={{ 
                       opacity: hoveredCompany ? (hoveredCompany === '其他厂商' ? 1 : 0.4) : 1,
                       transition: 'all 0.2s ease-in-out',
                       cursor: 'pointer'
                     }}
                   />
                 )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">请选择车企查看销量数据</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SalesTrendChart;