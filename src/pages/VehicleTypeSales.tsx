import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { DateRange, CarModelData } from '../types';
import DateFilter from '../components/DateFilter';
import { useLocation } from 'react-router-dom';
import ViewSelector from '../components/ViewSelector';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { getCurrentCarModelData, carCompanies, formatMonthWithYear } from '../mocks/data';
import VehicleTypeTop10Table from '../components/VehicleTypeTop10Table';

export default function VehicleTypeSales() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  // 从路由状态中获取日期范围，如果没有则使用默认值
  const initialDateRange = location.state?.dateRange || {
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vehicleTypeData, setVehicleTypeData] = useState<any[]>([]); // 车辆类型销量占比数据
  const [manufacturerVehicleTypeData, setManufacturerVehicleTypeData] = useState<any[]>([]); // 各厂商车辆类型分布数据
  const [monthlyVehicleTypeData, setMonthlyVehicleTypeData] = useState<any[]>([]); // 月度车辆类型变化数据
  const [vehicleTypeTrendData, setVehicleTypeTrendData] = useState<any[]>([]); // 车辆类型占比趋势数据
  const [totalSales, setTotalSales] = useState<number>(0); // 总销量

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

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
    // 1. 计算车辆类型销量占比
    const vehicleTypeSales: Record<string, number> = {};
    
    // 计算每种车辆类型的销量
    carModelData.forEach(model => {
      vehicleTypeSales[model.vehicleType] = (vehicleTypeSales[model.vehicleType] || 0) + model.sales;
    });
    
    // // 定义车辆类型的颜色映射
    // const vehicleTypeColors: Record<string, string> = {
    //   '紧凑型SUV': '#3b82f6',
    //   '中型SUV': '#10b981',
    //   '紧凑型车': '#f59e0b',
    //   '豪华SUV': '#8b5cf6',
    //   '未知': '#8884d8'
    // };



		// 1. 基于MD5生成均匀分布的哈希值（解决相似字符串哈希相近问题）
		const getMD5Hash = (str: string): number => {
		  // 简易MD5转数值（无需引入库，保证轻量且分布均匀）
		  let hash = 0;
		  for (let i = 0; i < str.length; i++) {
		    const char = str.charCodeAt(i);
		    hash = ((hash << 5) - hash) + char;
		    hash = hash & hash; // 转为32位整数
		  }
		  // 扩展哈希范围到更大的数值（提升分布均匀性）
		  const md5LikeHash = Math.abs(hash) * 1000000;
		  return md5LikeHash;
		};
		
		// 2. HSV转RGB（保留原逻辑，保证颜色转换正确）
		const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
		  let r, g, b;
		  const i = Math.floor(h * 6);
		  const f = h * 6 - i;
		  const p = v * (1 - s);
		  const q = v * (1 - f * s);
		  const t = v * (1 - (1 - f) * s);
		
		  switch (i % 6) {
		    case 0: r = v; g = t; b = p; break;
		    case 1: r = q; g = v; b = p; break;
		    case 2: r = p; g = v; b = t; break;
		    case 3: r = p; g = q; b = v; break;
		    case 4: r = t; g = p; b = v; break;
		    case 5: r = v; g = p; b = q; break;
		    default: r = v; g = v; b = v; break;
		  }
		  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		};
		
		// 3. 生成「完全随机+固定」的高区分度颜色（无任何分类逻辑）
		const getRandomFixedColor = (str: string): string => {
		  const hash = getMD5Hash(str);
		  
		  // 步骤1：基于哈希生成完全随机的色相（0-360°均匀分布）
		  // 取哈希值的不同分段计算，保证分布更均匀
		  const hue1 = (hash % 360) / 360;
		  const hue2 = ((hash / 1000) % 360) / 360;
		  // 最终色相：混合两段数值，避免单一取模导致的分布集中
		  const finalHue = (hue1 + hue2) % 1;
		
		  // 步骤2：固定饱和度（0.85）和明度（0.8），保证颜色美观且区分度
		  const saturation = 0.85; // 适中饱和度，不刺眼
		  const brightness = 0.8;  // 适中明度，避免过亮/过暗
		
		  // 步骤3：转RGB并生成十六进制颜色
		  const [r, g, b] = hsvToRgb(finalHue, saturation, brightness);
		  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
		};
		
		// 4. 车型列表
		const allVehicleTypes = [
		  '紧凑型SUV', '小型SUV', '中型SUV', '中大型SUV', '大型SUV',
		  '紧凑型车', '小型车', '中型车', '微型车', '中大型车', '大型车', '跑车',
		  '紧凑型MPV', '中型MPV', '中大型MPV', '大型MPV',
		  '微面'
		];
		
		// 5. 生成固定的随机颜色映射（同一车型每次生成的颜色完全相同）
		const vehicleTypeColors: Record<string, string> = {};
		allVehicleTypes.forEach(type => {
		  vehicleTypeColors[type] = getRandomFixedColor(type);
		});
		// 未知车型固定颜色（非随机）
		vehicleTypeColors['未知'] = '#9d80fe';





		
    
    // 转换为图表数据格式
    const vehicleData = Object.keys(vehicleTypeSales)
      .filter(type => type !== '未知' && vehicleTypeSales[type] > 0)
      .map(type => ({
        name: type,
        value: vehicleTypeSales[type],
        color: vehicleTypeColors[type] || '#8884d8'
      }))
      .sort((a, b) => b.value - a.value);
    
    // 计算总销量
    const total = vehicleData.reduce((sum, item) => sum + item.value, 0);
    
    // 2. 计算各厂商车辆类型分布
    const manufacturerMap = new Map<string, Record<string, number>>();
    
    // 按厂商和车辆类型分组统计销量
    carModelData.forEach(model => {
      if (!manufacturerMap.has(model.manufacturer)) {
        manufacturerMap.set(model.manufacturer, {});
      }
      
      const manufacturerData = manufacturerMap.get(model.manufacturer)!;
      manufacturerData[model.vehicleType] = (manufacturerData[model.vehicleType] || 0) + model.sales;
    });
    
    // 转换为图表数据格式
    const manufacturerData = Array.from(manufacturerMap.entries())
      .map(([manufacturer, vehicleData]) => {
        // 获取厂商颜色
        const company = carCompanies.find(c => c.name === manufacturer);
        const companyColor = company?.color || '#8b5cf6';
        
        // 初始化所有车辆类型为0
        const data: any = { manufacturer, color: companyColor };
        Object.keys(vehicleTypeSales).forEach(type => {
          if (type !== '未知') {
            data[type] = vehicleData[type] || 0;
          }
        });
        return data;
      })
      .sort((a, b) => {
        // 按总销量排序
        const salesA = Object.keys(a)
          .filter(key => key !== 'manufacturer' && key !== 'color')
          .reduce((sum, key) => sum + a[key], 0);
        const salesB = Object.keys(b)
          .filter(key => key !== 'manufacturer' && key !== 'color')
          .reduce((sum, key) => sum + b[key], 0);
        return salesB - salesA;
      });
    
    // 3. 计算月度车辆类型变化
    const monthlyMap = new Map<string, Record<string, number>>();
    
    // 按月份和车辆类型分组统计销量
    carModelData.forEach(model => {
      const monthKey = `${model.year}-${model.month}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {});
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData[model.vehicleType] = (monthData[model.vehicleType] || 0) + model.sales;
    });
    
    // 转换为图表数据格式并按时间排序
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([monthKey, vehicleData]) => {
        const [year, month] = monthKey.split('-');
        const formattedMonth = formatMonthWithYear(month, parseInt(year));
        
        // 初始化所有车辆类型为0
        const data: any = { month: formattedMonth };
        Object.keys(vehicleTypeSales).forEach(type => {
          if (type !== '未知') {
            data[type] = vehicleData[type] || 0;
          }
        });
        return data;
      })
      .sort((a, b) => {
        // 按月份排序
        return a.month.localeCompare(b.month);
      });
    
    // 4. 计算车辆类型占比趋势（虽然不直接显示，但需要保留数据结构以便tooltip计算占比）
    const trendData = monthlyData.map(monthData => {
      const monthTotal = Object.keys(monthData)
        .filter(key => key !== 'month')
        .reduce((sum, key) => sum + monthData[key], 0);
      
      const data: any = { month: monthData.month };
      Object.keys(monthData).forEach(key => {
        if (key !== 'month' && monthTotal > 0) {
          data[key] = parseFloat(((monthData[key] / monthTotal) * 100).toFixed(1));
        }
      });
      return data;
    });
    
    // 更新状态
    setVehicleTypeData(vehicleData);
    setManufacturerVehicleTypeData(manufacturerData);
    setMonthlyVehicleTypeData(monthlyData);
    setVehicleTypeTrendData(trendData);
    setTotalSales(total);
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

  // 🔧 核心修改：CustomTooltip 过滤销量为0的条目
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // 步骤1：过滤掉销量为0的条目
      const validPayload = payload.filter((entry: any) => entry.value > 0);
      
      // 步骤2：若过滤后无有效条目，不显示Tooltip
      if (validPayload.length === 0) return null;

      // 步骤3：计算该月份的总销量（基于原始payload，保证占比准确）
      const totalSalesInMonth = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{validPayload[0].payload.name || validPayload[0].payload.manufacturer}</p>
          {validPayload.map((entry: any, index: number) => {
            // 计算百分比（保留1位小数）
            const percentage = totalSalesInMonth > 0 
              ? ((entry.value / totalSalesInMonth) * 100).toFixed(1) 
              : '0.0';
            
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
        <ViewSelector currentView="vehicle-type" dateRange={dateRange} />

        {/* 视图标题 */}
        <motion.div 
          className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fa-solid fa-car-side text-red-500 mr-2"></i>
            车辆类型区分销量
          </h2>
        </motion.div>

        {/* 车辆类型销量占比和月度趋势 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">车辆类型销量占比</h3>
                <div className="h-[350px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500 dark:text-gray-400 flex items-center">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        <span>加载数据中...</span>
                      </div>
                    </div>
                  ) : vehicleTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={vehicleTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          animationDuration={1500}
                          animationBegin={200}
                        >
                          {vehicleTypeData.map((entry, index) => (
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
                          offset={100}
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
          </motion.div>

          {/* 月度车辆类型销量趋势 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">月度车辆类型销量趋势</h3>
                <div className="h-[350px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500 dark:text-gray-400 flex items-center">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        <span>加载数据中...</span>
                      </div>
                    </div>
                  ) : monthlyVehicleTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyVehicleTypeData}
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
                        {vehicleTypeData.map((vehicleType) => (
                          <Line 
                            key={vehicleType.name}
                            type="monotone" 
                            dataKey={vehicleType.name} 
                            stroke={vehicleType.color} 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                            activeDot={{ r: 8 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                    </div>
                  )}
                </div>
          </motion.div>
        </div>

  {/* 各厂商车辆类型分布 */}
  <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
    {/* 各厂商车辆类型分布 */}
    <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">各厂商车辆类型分布</h3>
                <div className="h-[1000px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500 dark:text-gray-400 flex items-center">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        <span>加载数据中...</span>
                      </div>
                    </div>
                  ) : manufacturerVehicleTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={manufacturerVehicleTypeData}
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
                         <Tooltip 
                          content={<CustomTooltip />} 
                          contentStyle={{ pointerEvents: 'none' }}
                          offset={100}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: 10 }}
                          formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                        />
                        {vehicleTypeData.map((vehicleType) => (
                          <Bar 
                            key={vehicleType.name}
                            dataKey={vehicleType.name} 
                            stackId="a" 
                            fill={vehicleType.color} 
                            radius={[0, 4, 4, 0]} 
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
          </motion.div>

           {/* 空缺位置 - 原车辆类型占比趋势模块已删除 */}
        </div>

        {/* 车辆类型区分销量TOP10模块 */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <VehicleTypeTop10Table dateRange={dateRange} />
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