import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { DateRange, CarModelData } from '../types';
import DateFilter from '../components/DateFilter';
import { useLocation } from 'react-router-dom';
import ViewSelector from '../components/ViewSelector';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { getCurrentCarModelData, formatMonthWithYear, getLatestModelPrice } from '../mocks/data';
import { energyTypes } from '../mocks/energyTypes';
import { isMainstreamManufacturer } from '../mocks/manufacturerCategories';
import EnergyTypeMonthlySalesTable from '../components/EnergyTypeMonthlySalesTable';
import MultipleEnergyTypeModelsTable from '../components/MultipleEnergyTypeModelsTable';
import EnergyTypeTop10Table from '../components/EnergyTypeTop10Table';

// 能源类型的颜色映射
const energyTypeColors: Record<string, string> = {
  '纯电': '#3b82f6',
  '插混': '#10b981',
  '燃油': '#ef4444',
  '增程': '#8b5cf6',
};

export default function EnergyTypeSales() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  // 从路由状态中获取日期范围，如果没有则使用默认值
  const initialDateRange = location.state?.dateRange || {
    startDate: '2024-12-01',
    endDate: '2026-02-01'
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [energyTypeData, setEnergyTypeData] = useState<any[]>([]); // 能源类型销量占比数据
  const [manufacturerEnergyTypeData, setManufacturerEnergyTypeData] = useState<any[]>([]); // 厂商能源类型分布数据
  const [monthlyEnergyTypeData, setMonthlyEnergyTypeData] = useState<any[]>([]); // 月度能源类型变化数据
  const [totalSales, setTotalSales] = useState<number>(0); // 总销量

  // 当日期范围变化时获取数据
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        // 从文件中获取数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 处理数据，生成所需的图表数据
        processData(carModelData);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [dateRange]);

  // 处理数据，生成图表所需的数据格式
  const processData = (carModelData: CarModelData[]) => {
    // 1. 计算能源类型销量占比
    const energyTypeSales: Record<string, number> = {};
    
    // 初始化所有能源类型为0
    energyTypes.forEach(type => {
      energyTypeSales[type.name] = 0;
    });
    
    // 计算每种能源类型的销量
    carModelData.forEach(model => {
      energyTypeSales[model.energyType] = (energyTypeSales[model.energyType] || 0) + model.sales;
    });
    
    // 转换为图表数据格式
    const energyData = Object.keys(energyTypeSales)
      .filter(type => type !== '未知' && energyTypeSales[type] > 0)
      .map(type => ({
        name: type,
        value: energyTypeSales[type],
        color: energyTypeColors[type] || '#8884d8'
      }))
      .sort((a, b) => b.value - a.value);
    
    // 计算总销量
    const total = energyData.reduce((sum, item) => sum + item.value, 0);
    
  // 2. 计算各厂商能源类型分布
  const manufacturerMap = new Map<string, Record<string, number>>();
  let otherManufacturerData: Record<string, number> = {};
  
  // 按厂商和能源类型分组统计销量
  carModelData.forEach(model => {
    // 初始化所有能源类型为0
    if (!otherManufacturerData[model.energyType]) {
      otherManufacturerData[model.energyType] = 0;
    }
    
    if (isMainstreamManufacturer(model.manufacturer)) {
      // 对于主流厂商，单独存储数据
      if (!manufacturerMap.has(model.manufacturer)) {
        manufacturerMap.set(model.manufacturer, {});
      }
      
      const manufacturerData = manufacturerMap.get(model.manufacturer)!;
      manufacturerData[model.energyType] = (manufacturerData[model.energyType] || 0) + model.sales;
    } else {
      // 对于非主流厂商，合并到"其他厂商"
      otherManufacturerData[model.energyType] += model.sales;
    }
  });
  
  // 转换为图表数据格式
  let manufacturerData = Array.from(manufacturerMap.entries())
    .map(([manufacturer, energyData]) => {
      // 初始化所有能源类型为0
      const data: any = { manufacturer, color: getManufacturerColor(manufacturer) };
      energyTypes.forEach(type => {
        data[type.name] = energyData[type.name] || 0;
      });
      return data;
    });
  
  // 添加"其他厂商"数据
  if (Object.keys(otherManufacturerData).length > 0) {
    const otherManufacturerSales = Object.values(otherManufacturerData).reduce((sum, sales) => sum + sales, 0);
    if (otherManufacturerSales > 0) {
      const otherData: any = { manufacturer: '其他厂商', color: '#8884d8' };
      energyTypes.forEach(type => {
        otherData[type.name] = otherManufacturerData[type.name] || 0;
      });
      manufacturerData.push(otherData);
    }
  }
  
  // 按总销量排序
  manufacturerData.sort((a, b) => {
    const salesA = Object.keys(a)
      .filter(key => key !== 'manufacturer' && key !== 'color')
      .reduce((sum, key) => sum + a[key], 0);
    const salesB = Object.keys(b)
      .filter(key => key !== 'manufacturer' && key !== 'color')
      .reduce((sum, key) => sum + b[key], 0);
    return salesB - salesA;
  });
    
    // 3. 计算月度能源类型变化
    const monthlyMap = new Map<string, Record<string, number>>();
    
    // 按月份和能源类型分组统计销量
    carModelData.forEach(model => {
      const monthKey = `${model.year}-${model.month}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {});
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData[model.energyType] = (monthData[model.energyType] || 0) + model.sales;
    });
    
    // 转换为图表数据格式并按时间排序
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([monthKey, energyData]) => {
        const [year, month] = monthKey.split('-');
        const formattedMonth = formatMonthWithYear(month, parseInt(year));
        
        // 初始化所有能源类型为0
        const data: any = { month: formattedMonth };
        energyTypes.forEach(type => {
          data[type.name] = energyData[type.name] || 0;
        });
        return data;
      })
      .sort((a, b) => {
        // 按月份排序
        return a.month.localeCompare(b.month);
      });
    
    // 更新状态
    setEnergyTypeData(energyData);
    setManufacturerEnergyTypeData(manufacturerData);
    setMonthlyEnergyTypeData(monthlyData);
    setTotalSales(total);
  };

  // 查找主要厂商的辅助函数
  const findMainManufacturerForEnergyType = (energyType: string): string => {
    // 从厂商能源类型数据中找出该能源类型销量最高的厂商
    const topManufacturers = [...manufacturerEnergyTypeData]
      .sort((a, b) => (b[energyType] || 0) - (a[energyType] || 0))
      .slice(0, 2)
      .filter(item => (item[energyType] || 0) > 0)
      .map(item => item.manufacturer);
      
    return topManufacturers.length > 0 ? topManufacturers.join('、') : '暂无数据';
  };

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    // 数据会在useEffect中自动更新
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

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // 计算该月份的总销量
      const totalSalesInMonth = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name || data.manufacturer}</p>
          {payload.map((entry: any, index: number) => {
            // 计算百分比
            const percentage = ((entry.value / totalSalesInMonth) * 100).toFixed(1);
            
            return (
              <p key={index} className="flex items-center mt-1">
                <span 
                  className="w-3 h-3 inline-block mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name}:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  {formatNumber(entry.value)} 辆 ({percentage}%)
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };
  
  // 根据厂商名称获取颜色
  const getManufacturerColor = (manufacturer: string): string => {
    const colorMap: Record<string, string> = {
      '特斯拉': '#E82127',
      '比亚迪': '#0066B3',
      '大众': '#000000',
      '丰田': '#EB0A1E',
      '本田': '#FF3333',
      '吉利': '#2C3E50',
      '理想': '#6b7280',
      '长安': '#10b981',
    };
    return colorMap[manufacturer] || '#8b5cf6'; // 默认颜色
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
        <ViewSelector currentView="energy-type" dateRange={dateRange} />

        {/* 视图标题 */}
        <motion.div 
          className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fa-solid fa-bolt text-purple-500 mr-2"></i>
            动力类型区分销量
          </h2>
        </motion.div>

        {/* 能源类型销量占比 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">能源类型销量占比</h3>
               <div className="h-[350px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500 dark:text-gray-400 flex items-center">
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      <span>加载数据中...</span>
                    </div>
                  </div>
                ) : energyTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={energyTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        animationDuration={1500}
                        animationBegin={200}
                      >
                        {energyTypeData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
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
          </motion.div>

          {/* 各厂商能源类型分布 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">各厂商能源类型分布</h3>
                 <div className="h-[700px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500 dark:text-gray-400 flex items-center">
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      <span>加载数据中...</span>
                    </div>
                  </div>
                ) : manufacturerEnergyTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={manufacturerEnergyTypeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis 
                        type="number"
                        tick={{ fill: '#6b7280' }} 
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <YAxis 
                        dataKey="manufacturer" 
                       type="category"
                       tick={{ fill: '#6b7280', fontSize: 12 }} 
                       axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                      />
                      <Bar dataKey="纯电" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="插混" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="燃油" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="增程" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                  </div>
                )}
              </div>
          </motion.div>
        </div>

         {/* 月度能源类型销量趋势 */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">月度能源类型销量趋势</h3>
          
          {/* 新增：能源类型销量趋势折线图 */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">能源类型销量趋势（折线图）</h4>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 dark:text-gray-400 flex items-center">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    <span>加载数据中...</span>
                  </div>
                </div>
              ) : monthlyEnergyTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyEnergyTypeData}
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
                      tickFormatter={(value) => formatNumber(value)}
                    />
                     <Tooltip 
                      content={<CustomTooltip />} 
                      contentStyle={{ pointerEvents: 'none' }}
                      offset={100}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                    />
                    <Line type="monotone" dataKey="纯电" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="插混" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="燃油" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="增程" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                </div>
              )}
            </div>
          </div>
          
          {/* 原有：能源类型销量趋势堆叠条形图 */}
          <div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">能源类型销量趋势（堆叠图）</h4>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 dark:text-gray-400 flex items-center">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    <span>加载数据中...</span>
                  </div>
                </div>
              ) : monthlyEnergyTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyEnergyTypeData}
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
                      tickFormatter={(value) => formatNumber(value)}
                    />
                     <Tooltip 
                      content={<CustomTooltip />} 
                      contentStyle={{ pointerEvents: 'none' }}
                      offset={100}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                    />
                    <Bar dataKey="纯电" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="插混" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="燃油" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="增程" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

         {/* 能源类型区分销量TOP10模块 */}
         <motion.div 
           className="mb-8"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.45 }}
         >
           <EnergyTypeTop10Table dateRange={dateRange} />
         </motion.div>

         {/* 多种能源类型车型信息模块 */}
         <motion.div 
           className="mb-8"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
         >
           <MultipleEnergyTypeModelsTable dateRange={dateRange} />
         </motion.div>

        {/* 能源类型销量明细表格 */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">能源类型销量明细</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    能源类型
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    销量
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    占比
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    主要厂商
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {energyTypeData.map((energyType) => {
                  const percentage = ((energyType.value / totalSales) * 100).toFixed(1);
                  
                  // 查找该能源类型的主要厂商
                  const mainManufacturer = findMainManufacturerForEnergyType(energyType.name);
                  
                  return (
                    <tr key={energyType.name} className="bg-white dark:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: energyType.color }}>
                            <i className={`fa-solid text-white ${
                              energyType.name === '纯电' ? 'fa-bolt' :
                              energyType.name === '插混' ? 'fa-plug' :
                              energyType.name === '燃油' ? 'fa-fire' :
                              'fa-battery-full'
                            }`}></i>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{energyType.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(energyType.value)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                              className="h-2.5 rounded-full" 
                              style={{ width: `${percentage}%`, backgroundColor: energyType.color }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-900 dark:text-white">{percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{mainManufacturer}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
             </table>
           </div>
           
           {/* 表格说明 */}
           <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
             注：表格展示各能源类型的销量、占比和主要厂商信息，数据基于选定的时间范围。
           </p>
         </motion.div>

        {/* 车企月度能源类型销量明细表格模块 */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <EnergyTypeMonthlySalesTable dateRange={dateRange} />
        </motion.div>

        {/* 页脚 */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
           <p className="text-center text-sm text-gray-500 dark:text-gray-400">
             © 2026 车企销量数据分析平台 | 数据更新时间: {new Date().toLocaleDateString()} | 数据来源: 文件数据
           </p>
        </div>
      </motion.div>
    </div>
  );
}