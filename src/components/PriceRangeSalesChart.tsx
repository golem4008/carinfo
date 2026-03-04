import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { DateRange } from '../types';
import { getCurrentCarModelData, getLatestModelPrice } from '../mocks/data';

interface PriceRangeSalesChartProps {
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

const PriceRangeSalesChart: React.FC<PriceRangeSalesChartProps> = ({ className = '', dateRange }) => {
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState<number>(0);
  // 新增：跟踪当前悬停的价格区间
  const [hoveredRange, setHoveredRange] = useState<string | null>(null);


  // 当日期范围变化时，更新图表数据
  useEffect(() => {
    updateChartData();
  }, [dateRange]);

  // 更新图表数据
  const updateChartData = () => {
    const carModelData = getCurrentCarModelData(dateRange);
    
    // 计算各价格区间的销量
    const priceRangeSales: any[] = [];
    const monthlyPriceRangeData: Record<string, Record<string, number>> = {};
    
    // 初始化各价格区间的销量为0
    PRICE_RANGES.forEach(range => {
      priceRangeSales.push({
        name: range.name,
        value: 0,
        color: range.color
      });
    });

     // 计算各车型的销量并累加到对应的价格区间
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
      
      if (priceRange) {
        const index = priceRangeSales.findIndex(item => item.name === priceRange.name);
        if (index !== -1) {
          priceRangeSales[index].value += model.sales;
        }

        // 按月统计各价格区间的销量
        const month = `${model.year}.${String(parseInt(model.month)).padStart(2, '0')}`;
        if (!monthlyPriceRangeData[month]) {
          monthlyPriceRangeData[month] = {};
          PRICE_RANGES.forEach(range => {
            monthlyPriceRangeData[month][range.name] = 0;
          });
        }
        monthlyPriceRangeData[month][priceRange.name] += model.sales;
      }
    });

    // 计算总销量
    const total = priceRangeSales.reduce((sum, item) => sum + item.value, 0);
    setTotalSales(total);

    // 计算市场份额
    const marketShareData = priceRangeSales.map(item => ({
      name: item.name,
      value: item.value,
      share: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
      color: item.color
    }));

    setPieChartData(marketShareData);

    // 转换月度数据为数组并排序
    const monthlyData = Object.keys(monthlyPriceRangeData)
      .map(month => ({
        month,
        ...monthlyPriceRangeData[month]
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setBarChartData(monthlyData);
  };

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">销量: {formatNumber(data.value)} 辆</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">市场份额: {data.share}%</p>
        </div>
      );
    }
    return null;
  };

   // 自定义Bar Tooltip
  const BarCustomTooltip = ({ active, payload, label }: any) => {
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
              <span className={`text-sm ${hoveredRange === entry.name ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {entry.name}:</span>
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

  // 处理柱状图的鼠标进入事件
  const handleBarMouseEnter = (rangeName: string) => {
    setHoveredRange(rangeName);
  };

  // 处理柱状图的鼠标离开事件
  const handleBarMouseLeave = () => {
    setHoveredRange(null);
  };

  // 处理图表的鼠标离开事件
  const handleChartMouseLeave = () => {
    setHoveredRange(null);
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
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">价格区间销量占比</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          按最低价格区间分析各区间销量占比及月度变化趋势
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 圆饼图 - 价格区间市场份额 */}
        <div className="h-[350px]">
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={1500}
                  animationBegin={200}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
        <Tooltip 
          content={<CustomTooltip />} 
          contentStyle={{ pointerEvents: 'none' }}
        offset={100} // 调整偏移量值为100
        />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          )}
        </div>

         {/* 柱状图 - 各价格区间月度销量（可左右滑动） */}
         <div className="h-[350px] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 rounded-lg">
           {barChartData.length > 0 ? (
              <div className="min-w-[800px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
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
                    <Tooltip content={<BarCustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className={`text-sm ${hoveredRange === value ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>}
                    />
                    {PRICE_RANGES.map((range) => (
                      <Bar 
                        key={range.name} 
                        dataKey={range.name} 
                        fill={range.color}
                        radius={[4, 4, 0, 0]}
                        animationDuration={1500}
                        // 添加鼠标事件处理器
                        onMouseEnter={() => handleBarMouseEnter(range.name)}
                        onMouseLeave={handleBarMouseLeave}
                        style={{ 
                          opacity: hoveredRange ? (hoveredRange === range.name ? 1 : 0.6) : 1,
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer'  // 添加指针样式，提升用户体验
                        }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
           ) : (
             <div className="flex items-center justify-center h-full">
               <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
             </div>
           )}
         </div>
         
         {/* 滚动提示 */}
         {barChartData.length > 0 && (
           <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
             <span>左右滑动可查看更多数据</span>
             <div className="flex items-center">
               <i className="fa-solid fa-hand-point-left mr-1"></i>
               <i className="fa-solid fa-hand-point-right"></i>
             </div>
           </div>
         )}
      </div>

      {/* 数据统计卡片 */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h4 className="text-base font-medium text-gray-700 dark:text-gray-300">总销量</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalSales)} 辆</p>
          </div>
          <div className="mt-3 sm:mt-0">
            <h4 className="text-base font-medium text-gray-700 dark:text-gray-300">价格区间数量</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{PRICE_RANGES.length}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PriceRangeSalesChart;