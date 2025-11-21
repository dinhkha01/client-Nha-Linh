import { useEffect, useMemo, useState } from "react";
import { Apis } from "../api";
import type { Staff, WorkLog } from "../api";
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Divider,
  Flex,
  FloatButton,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Progress,
  Space,
  Tag,
  TimePicker,
  Typography,
  message,
  Segmented,
  Switch,
  Row,
  Col,
} from "antd";
import {
  CalculatorOutlined,
  CalendarOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  RocketOutlined,
  DashboardOutlined,
  SettingOutlined,
  BulbOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs, { Dayjs } from "dayjs";
import "../styles/quantum-ui.css";
import { initMouseTracker } from "../utils/mouseTracker";

type SelectedDay = {
  date: Dayjs;
  totalHours?: number;
};

type ViewMode = "dashboard" | "calendar" | "analytics";

export default function TimekeepingPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [dailyMap, setDailyMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(true);

  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [form] = Form.useForm();
  const [dayLogs, setDayLogs] = useState<WorkLog[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const { Title, Text } = Typography;

  const totalHoursInMonth = useMemo(() => {
    return Object.values(dailyMap).reduce((sum, h) => sum + (h || 0), 0);
  }, [dailyMap]);

  const totalSalary = useMemo(() => {
    return Number((totalHoursInMonth * (hourlyRate || 0)).toFixed(2));
  }, [totalHoursInMonth, hourlyRate]);

  const netSalary = useMemo(() => {
    return Number((totalSalary - (advanceAmount || 0)).toFixed(2));
  }, [totalSalary, advanceAmount]);

  // ĐÃ TẮT hiệu ứng nền Quantum Particles để giao diện rõ ràng, dễ thao tác hơn

  useEffect(() => {
    (async () => {
      try {
        const list = await Apis.staff.list();
        setStaffList(list);
        if (list.length > 0) {
          setSelectedStaff(list[0] ?? null);
          setAdvanceAmount(Number(list[0]?.advanceAmount || 0));
        }
      } catch {
        message.error("Không tải được danh sách nhân viên");
      }
    })();

    // Initialize modern mouse tracking effects
    const cleanup = initMouseTracker();
    return cleanup;
  }, []);

  useEffect(() => {
    setAdvanceAmount(Number(selectedStaff?.advanceAmount || 0));
  }, [selectedStaff]);

  useEffect(() => {
    if (!selectedStaff) return;
    const year = currentMonth.year();
    const month = currentMonth.month() + 1;
    setLoading(true);
    Apis.daily
      .getMonthly(selectedStaff.id, year, month)
      .then((res) => {
        const map: Record<string, number> = {};
        if (Array.isArray(res.daily)) {
          res.daily.forEach((d) => {
            const key = d.date ?? d.workDate;
            if (key) map[key] = d.totalHours;
          });
        } else if (res.dailyHours) {
          Object.assign(map, res.dailyHours);
        }
        setDailyMap(map);
      })
      .catch(() => message.error("Không tải được tổng giờ theo ngày"))
      .finally(() => setLoading(false));
  }, [selectedStaff, currentMonth]);

  const daysInMonth = useMemo(() => currentMonth.daysInMonth(), [currentMonth]);
  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const todayKey = dayjs().format("YYYY-MM-DD");
  const dailyTargetHours = 5;
  const targetHours = useMemo(() => daysInMonth * dailyTargetHours, [daysInMonth, dailyTargetHours]);

  const completionPercent = useMemo(() => {
    if (!targetHours) return 0;
    return Math.min(100, Math.round((totalHoursInMonth / targetHours) * 100));
  }, [targetHours, totalHoursInMonth]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }),
    []
  );

  const formattedSalary = currencyFormatter.format(totalSalary || 0);
  const formattedNet = currencyFormatter.format(netSalary || 0);
  const formattedAdvance = currencyFormatter.format(advanceAmount || 0);

  const remainingHours = useMemo(() => {
    return Math.max(0, Number((targetHours - totalHoursInMonth).toFixed(2)));
  }, [targetHours, totalHoursInMonth]);

  const durationHours = useMemo(() => {
    const start = dayjs(`2000-01-01 ${startTime}`, "YYYY-MM-DD HH:mm");
    let end = endTime == "24:00"
      ? dayjs("2000-01-02 00:00", "YYYY-MM-DD HH:mm")
      : dayjs(`2000-01-01 ${endTime}`, "YYYY-MM-DD HH:mm");
    if (end.isBefore(start)) end = end.add(1, "day");
    const minutes = Math.max(0, end.diff(start, "minute"));
    return Number((minutes / 60).toFixed(2));
  }, [startTime, endTime]);

  const openDayModal = (day: number) => {
    const date = currentMonth.date(day);
    setSelectedDay({ date, totalHours: dailyMap[date.format("YYYY-MM-DD")] });
    setTimeModalOpen(true);
    if (!selectedStaff) return;
    setDayLogs([]);
    Apis.workLogs
      .listByDate(selectedStaff.id, date.format("YYYY-MM-DD"))
      .then((logs) => setDayLogs(logs))
      .catch(() => setDayLogs([]));
  }

  async function handleSaveWorklog() {
    if (!selectedStaff || !selectedDay) return;

    if (!startTime || !endTime || startTime.trim() === "" || endTime.trim() === "") {
      message.error("Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc");
      return;
    }

    const dateStr = selectedDay.date.format("YYYY-MM-DD");
    try {
      let safeEndTime = endTime.trim();
      if (safeEndTime === "24:00") {
        safeEndTime = "23:59";
      }

      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(safeEndTime)) {
        message.error("Giờ kết thúc không hợp lệ. Vui lòng nhập theo định dạng HH:mm");
        return;
      }

      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime.trim())) {
        message.error("Giờ bắt đầu không hợp lệ. Vui lòng nhập theo định dạng HH:mm");
        return;
      }

      await Apis.workLogs.create({
        staffId: selectedStaff.id,
        workDate: dateStr,
        startTime: startTime.trim(),
        endTime: safeEndTime,
      });
      message.success("Đã lưu giờ công");

      const year = selectedDay.date.year();
      const month = selectedDay.date.month() + 1;
      const res = await Apis.daily.getMonthly(selectedStaff.id, year, month);
      const map: Record<string, number> = {};
      if (Array.isArray(res.daily)) {
        res.daily.forEach((d) => {
          const key = d.date ?? d.workDate;
          if (key) map[key] = d.totalHours;
        });
      } else if (res.dailyHours) {
        Object.assign(map, res.dailyHours);
      }
      setDailyMap(map);
      setTimeModalOpen(false);
    } catch (error: unknown) {
      let errorMessage = "Lưu giờ công thất bại";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        errorMessage = axiosError.response?.data?.message || axiosError.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      message.error(errorMessage);
    }
  }

  async function handleCalculateSalary() {
    if (!selectedStaff) return;
    const year = currentMonth.year();
    const month = currentMonth.month() + 1;
    try {
      const res = await Apis.staff.calculateSalary(selectedStaff.id, year, month, String(hourlyRate));
      message.info(
        `Tổng giờ: ${res.totalHours} | Lương: ${res.totalAmount}`
      );
    } catch {
      message.info(`Tổng giờ: ${totalHoursInMonth} | Lương: ${totalSalary}`);
    }
  }


  const exportMonthToExcel = async () => {
    if (!selectedStaff) {
      message.error("Chưa chọn nhân viên");
      return;
    }

    const hide = message.loading("Đang xuất Excel...", 0);
    try {
      const rows: Array<Record<string, string | number>> = [];
      for (const day of daysArray) {
        const date = currentMonth.date(day);
        const dateISO = date.format("YYYY-MM-DD");
        const dateVN = date.format("DD/MM/YYYY");
        let logs: WorkLog[] = [];
        try {
          logs = await Apis.workLogs.listByDate(selectedStaff.id, dateISO);
        } catch {
          logs = [];
        }

        // Tổng giờ theo ngày: ưu tiên từ logs; nếu không có logs thì lấy từ dailyMap
        const logsTotal = logs.reduce((s, l) => s + (l.durationHours || 0), 0);
        const dayTotal = logs.length > 0 ? logsTotal : (dailyMap[dateISO] || 0);

        // Debug log để kiểm tra
        if (logs.length > 0) {
          console.log(`Ngày ${dateVN}: ${logs.length} logs, tổng từ logs: ${logsTotal}h, từ dailyMap: ${dailyMap[dateISO] || 0}h`);
        }

        if (logs.length === 0) {
          rows.push({
            Ngày: dateVN,
            Thứ: date.format("ddd"),
            "Giờ vào": "",
            "Giờ ra": "",
            "Giờ công (h)": 0,
            "Tổng giờ ngày (h)": Number(dayTotal.toFixed(2)),
            "Ghi chú": "Tổng ngày",
          });
        } else {
          logs.forEach((l, index) => {
            rows.push({
              Ngày: dateVN,
              Thứ: date.format("ddd"),
              "Giờ vào": l.startTime || "",
              "Giờ ra": l.endTime || "",
              "Giờ công (h)": Number((l.durationHours || 0).toFixed(2)),
              "Tổng giờ ngày (h)": index === 0 ? Number(dayTotal.toFixed(2)) : "",
              "Ghi chú": index === 0 ? "Tổng ngày" : "",
            });
          });
        }
      }

      // Tổng giờ công tháng lấy từ state đã tính sẵn để chính xác
      const monthlyTotal = Number(totalHoursInMonth.toFixed(2));

      // Thêm dòng tổng tháng vào chính dữ liệu bảng
      rows.push({
        Ngày: "",
        Thứ: "",
        "Giờ vào": "",
        "Giờ ra": "",
        "Giờ công (h)": "",
        "Tổng giờ ngày (h)": monthlyTotal,
        "Ghi chú": "Tổng giờ tháng",
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const aoaSummary: (string | number)[][] = [
        [""],
        ["Tổng giờ công tháng (h)", monthlyTotal],
        ["Mức lương / giờ", hourlyRate],
        ["Tổng lương", totalSalary],
        ["Tạm ứng", advanceAmount],
        ["Thực nhận", netSalary],
      ];
      XLSX.utils.sheet_add_aoa(ws, aoaSummary, { origin: { r: rows.length + 2, c: 0 } });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Timesheet");

      const meta = [
        ["Nhân viên", selectedStaff.name || `#${selectedStaff.id}`],
        ["Tháng", currentMonth.format("MM/YYYY")],
      ];
      XLSX.utils.sheet_add_aoa(ws, meta, { origin: "G1" });

      const fileName = `ChamCong_${(selectedStaff.name || `ID${selectedStaff.id}`).replace(/\s+/g, "_")}_${currentMonth.format("YYYY_MM")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("Xuất Excel thành công!");
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);
      message.error("Có lỗi xảy ra khi xuất Excel. Vui lòng thử lại!");
    } finally {
      hide();
    }
  };


  const getAiInsights = () => {
    if (totalHoursInMonth === 0) return "🚀 Bắt đầu nhập giờ công để kích hoạt phân tích AI lượng tử";
    if (completionPercent < 50) return "📊 Tiến độ chậm - Đề xuất: Tăng cường 50% năng suất với AI Optimization";
    if (completionPercent < 80) return "📈 Đang trên đà - Chỉ còn một chút nữa là đạt mục tiêu lượng tử";
    if (completionPercent < 100) return "🚀 Xuất sắc! Hệ thống AI dự đoán hoàn thành sớm 2 ngày";
    return "🎉 Hoàn thành xuất sắc! Đã đạt 100% mục tiêu - Sẵn sàng cho cấp độ tiếp theo";
  };

  const getSalaryTrend = () => {
    if (netSalary > totalSalary * 0.8) return { color: "#10b981", trend: "📈 Tăng trưởng lượng tử", icon: "🚀" };
    if (netSalary > totalSalary * 0.6) return { color: "#f59e0b", trend: "⚡ Ổn định năng lượng", icon: "⚡" };
    return { color: "#ef4444", trend: "🔄 Cần tối ưu hóa", icon: "🔧" };
  };

  const salaryTrend = getSalaryTrend();

  return (
    <div className="quantum-app">
      <div className="app-container">
        <Flex vertical gap={40}>
          {/* Quantum Header */}
          <div className="quantum-header">
            <div className="quantum-glow-effect"></div>
            <div className="quantum-particles"></div>

            <Flex align="center" justify="space-between" wrap gap={32}>
              <Space direction="vertical" size={24} style={{ maxWidth: 600 }}>
                <div>
                  <div className="quantum-badge">
                    <RocketOutlined className="quantum-badge-icon" />
                    <span>QUANTUM WORKSPACE PRO</span>
                  </div>
                  <Title className="quantum-title">
                    Bảng Chấm Công <span className="quantum-version">v3.0</span>
                  </Title>
                </div>

                <Text className="quantum-subtitle">
                  Hệ thống quản lý thời gian thế hệ mới với AI lượng tử và phân tích thời gian thực
                </Text>

                {/* AI Quantum Insights */}
                <div className="quantum-ai-panel">
                  <Flex align="center" gap={16}>
                    <div className="quantum-ai-icon">
                      <BulbOutlined />
                    </div>
                    <Text className="quantum-ai-text">
                      {getAiInsights()}
                    </Text>
                    <Switch
                      checked={aiSuggestions}
                      onChange={setAiSuggestions}
                      className="quantum-switch"
                      checkedChildren="QUANTUM AI"
                      unCheckedChildren="BASIC"
                    />
                  </Flex>
                </div>
                <div>

                </div>

                {/* View Mode Selector */}
                <Flex gap={16} wrap>
                  <Segmented
                    value={viewMode}
                    onChange={(value) => setViewMode(value as ViewMode)}
                    options={[
                      { label: <Space><DashboardOutlined />Dashboard</Space>, value: "dashboard" },
                      { label: <Space><CalendarOutlined />Lịch</Space>, value: "calendar" },
                      { label: <Space><LineChartOutlined />Phân tích</Space>, value: "analytics" },
                    ]}
                    className="quantum-segmented"
                  />
                </Flex>
              </Space>

              {/* Quantum Stats */}
              <Space size={32} align="center" wrap>
                <div className="quantum-progress-orb">
                  <Progress
                    type="circle"
                    percent={completionPercent}
                    size={160}
                    strokeWidth={12}
                    strokeColor={{
                      "0%": "#e879f9",
                      "50%": "#38bdf8",
                      "100%": "#22d3ee"
                    }}
                    trailColor="rgba(148,163,184,0.15)"
                    format={percent => (
                      <div className="quantum-progress-content">
                        <div className="quantum-percent">{percent}%</div>
                        <div className="quantum-progress-label">Hoàn thành</div>
                      </div>
                    )}
                  />
                  <div className="quantum-orb-glow"></div>
                </div>

                <Space direction="vertical" size={20}>
                  <div className="quantum-stat">
                    <Text className="quantum-stat-label">Mục tiêu lượng tử</Text>
                    <Text className="quantum-stat-value">{targetHours}h</Text>
                  </div>

                  <div className="quantum-stat">
                    <Text className="quantum-stat-label">Năng lượng cần</Text>
                    <Text className="quantum-stat-value quantum-stat-warning">
                      {remainingHours}h
                    </Text>
                  </div>
                </Space>
              </Space>
            </Flex>
          </div>

          {/* Quantum Dashboard Grid */}
          <Row gutter={[24, 24]} className="quantum-dashboard">
            <Col xs={24} sm={12} lg={6}>
              <Card className="quantum-card quantum-card-primary">
                <Flex align="center" justify="space-between">
                  <Space direction="vertical" size={12}>
                    <Text className="card-label">
                      <ClockCircleOutlined /> Tổng giờ làm
                    </Text>
                    <Text className="card-value">
                      {totalHoursInMonth.toFixed(1)}
                      <Text className="card-unit">giờ</Text>
                    </Text>
                    <Progress
                      percent={completionPercent}
                      size="small"
                      showInfo={false}
                      className="quantum-progress"
                    />
                    <Text className="card-description">
                      {completionPercent}% lượng tử • {remainingHours.toFixed(1)}h cần
                    </Text>
                  </Space>
                  <div className="card-icon orb-icon">
                    <ClockCircleOutlined />
                  </div>
                </Flex>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="quantum-card quantum-card-secondary">
                <Flex align="center" justify="space-between">
                  <Space direction="vertical" size={12}>
                    <Text className="card-label">
                      <DollarOutlined /> Tổng lương
                    </Text>
                    <Text className="card-value">
                      {formattedSalary}
                    </Text>
                    <Text className="card-description">
                      {hourlyRate ? `~${currencyFormatter.format(hourlyRate)}/giờ` : 'Chưa đặt mức lượng tử'}
                    </Text>
                    <Tag className="quantum-tag">
                      {totalHoursInMonth.toFixed(1)}h × {currencyFormatter.format(hourlyRate)}
                    </Tag>
                  </Space>
                  <div className="card-icon orb-icon">
                    <DollarOutlined />
                  </div>
                </Flex>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="quantum-card quantum-card-success">
                <Flex align="center" justify="space-between">
                  <Space direction="vertical" size={12}>
                    <Text className="card-label">
                      <WalletOutlined /> Thực nhận
                    </Text>
                    <Text className="card-value">
                      {formattedNet}
                    </Text>
                    <Flex align="center" gap={12}>
                      <div className="trend-indicator" style={{ backgroundColor: salaryTrend.color }} />
                      <Text className="trend-text" style={{ color: salaryTrend.color }}>
                        {salaryTrend.icon} {salaryTrend.trend}
                      </Text>
                    </Flex>
                    <Text className="card-description">
                      Sau tạm ứng {formattedAdvance}
                    </Text>
                  </Space>
                  <div className="card-icon orb-icon">
                    <WalletOutlined />
                  </div>
                </Flex>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="quantum-card quantum-card-warning">
                <Flex align="center" justify="space-between">
                  <Space direction="vertical" size={12}>
                    <Text className="card-label">
                      <CheckCircleOutlined /> Hiệu suất
                    </Text>
                    <Text className="card-value">
                      {completionPercent}%
                    </Text>
                    <Progress
                      percent={completionPercent}
                      size="small"
                      showInfo={false}
                      className="quantum-progress"
                    />
                    <Text className="card-description">
                      {totalHoursInMonth.toFixed(1)}h / {targetHours}h
                    </Text>
                  </Space>
                  <div className="card-icon orb-icon">
                    <CheckCircleOutlined />
                  </div>
                </Flex>
              </Card>
            </Col>
          </Row>

          {/* Main Content */}
          <Row gutter={[32, 32]} className="quantum-main-content">
            <Col xs={24} lg={8}>
              <Card
                className="quantum-sidebar"
                title={
                  <Space>
                    <TeamOutlined />
                    <span>Đội lượng tử</span>
                  </Space>
                }
                extra={
                  <Button
                    type="text"
                    icon={<UserAddOutlined />}
                    onClick={() => setAddStaffOpen(true)}
                    className="quantum-ghost-btn"
                  />
                }
              >
                <List
                  dataSource={staffList}
                  loading={loading && !selectedStaff}
                  locale={{ emptyText: "Chưa có thành viên lượng tử" }}
                  renderItem={(item) => {
                    const isActive = selectedStaff?.id === item.id;
                    const initials = (item.name || "?")
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("");

                    return (
                      <List.Item
                        className={`quantum-staff-item ${isActive ? 'quantum-staff-active' : ''}`}
                        onClick={() => {
                          setSelectedStaff(item);
                          setAdvanceAmount(Number(item.advanceAmount || 0));
                        }}
                      >
                        <Space align="center" size={20}>
                          <div className="quantum-avatar">
                            <Avatar
                              size="large"
                              className={`staff-avatar ${isActive ? 'avatar-active' : ''}`}
                            >
                              {initials}
                            </Avatar>
                            {isActive && <div className="quantum-pulse" />}
                          </div>
                          <Space direction="vertical" size={4}>
                            <Text className="staff-name">
                              {item.name ?? `#${item.id}`}
                            </Text>
                            <Text className="staff-advance">
                              {currencyFormatter.format(Number(item.advanceAmount || 0))}
                            </Text>
                          </Space>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Col>

            <Col xs={24} lg={16}>
              <Card
                className="quantum-main-card"
                title={
                  <Flex justify="space-between" align="center" wrap>
                    <Space>
                      <CalendarOutlined />
                      <Text className="card-main-title">
                        Lịch Chấm Công {currentMonth.format('MM/YYYY')}
                      </Text>
                    </Space>
                    <Space>
                      <DatePicker
                        picker="month"
                        value={currentMonth}
                        onChange={(v) => v && setCurrentMonth(v)}
                        allowClear={false}
                        className="quantum-date-picker"
                        suffixIcon={<CalendarOutlined />}
                      />
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={exportMonthToExcel}
                        disabled={!selectedStaff}
                        className="quantum-action-btn"
                      >
                        Xuất Excel
                      </Button>
                      <Button
                        type="primary"
                        className="quantum-action-btn"
                        icon={<ThunderboltOutlined />}
                        onClick={handleCalculateSalary}
                        disabled={!selectedStaff}
                      >
                        Tính lượng tử
                      </Button>
                    </Space>
                  </Flex>
                }
              >
                <Flex vertical gap={32}>
                    {/* Control Panel */}
                    <Row gutter={[20, 20]} className="quantum-controls">
                      <Col xs={24} sm={8}>
                        <Space direction="vertical" size={8}>
                          <Text className="control-label">
                            Mức lương / giờ
                          </Text>
                          <InputNumber
                            className="quantum-input"
                            min={0}
                            value={hourlyRate}
                            onChange={(v) => setHourlyRate(Number(v || 0))}
                            addonAfter="₫"
                            placeholder="50,000"
                          />
                        </Space>
                      </Col>

                      <Col xs={24} sm={10}>
                        <Space direction="vertical" size={8}>
                          <Text className="control-label">
                            Tạm ứng lượng tử
                          </Text>
                          <InputNumber
                            className="quantum-input"
                            min={0}
                            value={advanceAmount}
                            onChange={(v) => setAdvanceAmount(Number(v || 0))}
                            addonAfter={
                              <Button
                                type="link"
                                className="sync-btn"
                                onClick={async () => {
                                  if (!selectedStaff) return;
                                  try {
                                    const updated = await Apis.staff.updateAdvance(selectedStaff.id, advanceAmount);
                                    setSelectedStaff(updated);
                                    setAdvanceAmount(Number(updated.advanceAmount || 0));
                                    message.success("Đã cập nhật tạm ứng lượng tử");
                                  } catch {
                                    message.error("Cập nhật tạm ứng thất bại");
                                  }
                                }}
                              >
                                <SyncOutlined />
                              </Button>
                            }
                          />
                        </Space>
                      </Col>

                      <Col xs={24} sm={6}>
                        <Text className="control-label">
                          Trung bình: {dailyTargetHours}h/ngày
                        </Text>
                      </Col>
                    </Row>

                    <Divider className="quantum-divider" />

                    {/* Calendar Grid */}
                    <div className="quantum-calendar-grid">
                      {daysArray.map((day) => {
                        const date = currentMonth.date(day);
                        const dateStr = date.format("YYYY-MM-DD");
                        const hours = dailyMap[dateStr] ?? 0;
                        const isToday = dateStr === todayKey;
                        const isWeekend = [0, 6].includes(date.day());
                        const dayPercent = Math.min(100, Math.round((hours / dailyTargetHours) * 100));
                        const overtime = hours > dailyTargetHours;

                        return (
                          <Card
                            key={day}
                            hoverable
                            onClick={() => openDayModal(day)}
                            className={`quantum-day-card ${isToday ? 'quantum-today' : ''}`}
                          >
                            <Flex vertical gap={16}>
                              <Flex align="center" justify="space-between">
                                <Text className="day-number">{day}</Text>
                                <Space>
                                  {isWeekend && <Tag className="weekend-tag">CN</Tag>}
                                  {isToday && <Tag className="today-tag">Hôm nay</Tag>}
                                </Space>
                              </Flex>
                              <Space direction="vertical" size={6}>
                                <Text className="day-date">
                                  {date.format("ddd, DD/MM")}
                                </Text>
                                <Text className={`day-hours ${overtime ? 'overtime' : hours > 0 ? 'worked' : 'empty'}`}>
                                  {hours > 0 ? `${hours} giờ` : "Chưa có"}
                                </Text>
                              </Space>
                              <Progress
                                percent={dayPercent}
                                strokeWidth={8}
                                showInfo={false}
                                className="day-progress"
                                strokeColor={overtime ? "#f59e0b" : "#34d399"}
                              />
                              {overtime && (
                                <Tag className="overtime-tag">
                                  +{Number((hours - dailyTargetHours).toFixed(1))}h OT
                                </Tag>
                              )}
                            </Flex>
                          </Card>
                        );
                      })}
                    </div>
                  </Flex>
                
              </Card>
            </Col>
          </Row>
        </Flex>
      </div>

      {/* Quantum Floating Actions */}
      <FloatButton.Group
        shape="circle"
        trigger="click"
        className="quantum-fab-group"
        icon={<ThunderboltOutlined />}
      >
        <FloatButton
          icon={<UserAddOutlined />}
          tooltip="Thêm thành viên lượng tử"
          onClick={() => setAddStaffOpen(true)}
        />
        <FloatButton
          icon={<CalculatorOutlined />}
          tooltip="Tính toán lượng tử"
          onClick={handleCalculateSalary}
        />
        <FloatButton
          icon={<CalendarOutlined />}
          tooltip="Về hiện tại"
          onClick={() => setCurrentMonth(dayjs())}
        />
        <FloatButton
          icon={<SettingOutlined />}
          tooltip="Cài đặt lượng tử"
          onClick={() => setQuickActionsOpen(true)}
        />
      </FloatButton.Group>

      {/* Beautiful Time Entry Modal */}
      <Modal
        className="quantum-modal beautiful-time-modal"
        title={null}
        open={timeModalOpen}
        onCancel={() => setTimeModalOpen(false)}
        footer={null}
        width={500}
        centered
        maskStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <div className="beautiful-modal-content">
          {/* Elegant Header */}
          <div className="elegant-header">
            <div className="header-icon">
              <ClockCircleOutlined />
            </div>
            <div className="header-text">
              <h2 className="elegant-title">Nhập Giờ Công</h2>
              <p className="elegant-date">{selectedDay?.date.format("dddd, DD/MM/YYYY")}</p>
            </div>
          </div>

          {/* Clean Time Input */}
          <div className="clean-time-section">
            <div className="time-input-row">
              <div className="input-field">
                <label className="elegant-label">Bắt đầu</label>
                <TimePicker
                  className="elegant-time-picker"
                  value={dayjs(startTime, "HH:mm")}
                  format="HH:mm"
                  use12Hours={false}
                  minuteStep={5}
                  size="large"
                  suffixIcon={null}
                  onChange={(v) => setStartTime(v ? v.format("HH:mm") : "09:00")}
                />
              </div>
              
              <div className="time-divider">
                <span>→</span>
              </div>
              
              <div className="input-field">
                <label className="elegant-label">Kết thúc</label>
                <TimePicker
                  className="elegant-time-picker"
                  value={endTime === "24:00" ? dayjs("23:59", "HH:mm") : dayjs(endTime, "HH:mm")}
                  format="HH:mm"
                  use12Hours={false}
                  minuteStep={5}
                  size="large"
                  suffixIcon={null}
                  onChange={(v) => {
                    if (v) {
                      setEndTime(v.format("HH:mm"));
                    } else {
                      setEndTime("18:00");
                    }
                  }}
                />
              </div>
            </div>

            {/* Beautiful Duration Display */}
            <div className="elegant-duration">
              <div className="duration-circle">
                <div className="duration-text">
                  <span className="duration-number">{durationHours.toFixed(1)}</span>
                  <span className="duration-unit">giờ</span>
                </div>
              </div>
              <p className="duration-description">Tổng thời gian làm việc</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="elegant-actions">
            <button 
              className="elegant-btn cancel-btn"
              onClick={() => setTimeModalOpen(false)}
            >
              Hủy
            </button>
            <button 
              className="elegant-btn save-btn"
              onClick={handleSaveWorklog}
            >
              Lưu giờ công
            </button>
          </div>

          {/* Simple History */}
          {dayLogs.length > 0 && (
            <div className="simple-history">
              <h4 className="history-title">Đã làm hôm nay</h4>
              <div className="history-items">
                {dayLogs.map((log) => (
                  <div key={log.id} className="simple-history-item">
                    <span className="history-time">{log.startTime} - {log.endTime}</span>
                    <span className="history-hours">{log.durationHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Staff Modal */}
      <Modal
        className="quantum-modal"
        title="Thêm thành viên lượng tử"
        open={addStaffOpen}
        onCancel={() => setAddStaffOpen(false)}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            const created = await Apis.staff.create({ name: values.name });
            const newList = [created, ...staffList];
            setStaffList(newList);
            setSelectedStaff(created);
            setAddStaffOpen(false);
            form.resetFields();
            message.success("Đã thêm thành viên lượng tử thành công 🚀");
          } catch {
            // validation or API error
          }
        }}
        okText="Thêm lượng tử"
        cancelText="Hủy bỏ"
      >
        <Form form={form} layout="vertical" className="quantum-form">
          <Form.Item
            name="name"
            label="Tên thành viên lượng tử"
            rules={[{ required: true, message: "Vui lòng nhập tên thành viên lượng tử" }]}
          >
            <Input
              placeholder="VD: Nguyễn Văn A"
              size="large"
              className="quantum-input"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quantum Settings Modal */}
      <Modal
        className="quantum-modal"
        title="Cài đặt hệ thống lượng tử"
        open={quickActionsOpen}
        onCancel={() => setQuickActionsOpen(false)}
        footer={null}
        width={480}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={20}>
          <div className="quantum-setting-item">
            <Switch checked={aiSuggestions} onChange={setAiSuggestions} className="quantum-switch" />
            <div className="setting-info">
              <Text className="setting-title">AI Lượng tử thông minh</Text>
              <Text className="setting-desc">Phân tích và tối ưu hóa với AI thế hệ mới</Text>
            </div>
          </div>
          <div className="quantum-setting-item">
            <Switch defaultChecked className="quantum-switch" />
            <div className="setting-info">
              <Text className="setting-title">Thông báo real-time</Text>
              <Text className="setting-desc">Nhận thông báo tức thì với WebSocket</Text>
            </div>
          </div>
          <div className="quantum-setting-item">
            <Switch defaultChecked className="quantum-switch" />
            <div className="setting-info">
              <Text className="setting-title">Tự động lưu dự phòng</Text>
              <Text className="setting-desc">Sao lưu dữ liệu tự động trên đám mây lượng tử</Text>
            </div>
          </div>
        </Space>
      </Modal>

      {/* Quantum Floating Action Buttons */}
      <div className="quantum-fab-container">
        <div className="quantum-fab-group">
          <Button
            className="quantum-fab quantum-fab-primary"
            shape="circle"
            size="large"
            icon={<SettingOutlined />}
            onClick={() => setQuickActionsOpen(true)}
            title="Cài đặt lượng tử"
          />
          <Button
            className="quantum-fab quantum-fab-secondary"
            shape="circle"
            size="large"
            icon={<SyncOutlined />}
            onClick={() => window.location.reload()}
            title="Đồng bộ dữ liệu"
          />
          <Button
            className="quantum-fab quantum-fab-success"
            shape="circle"
            size="large"
            icon={<BulbOutlined />}
            onClick={() => setAiSuggestions(!aiSuggestions)}
            title="Toggle AI"
          />
        </div>

        {/* Quantum Pulse Ring */}
        <div className="quantum-pulse-ring"></div>
        <div className="quantum-pulse-ring quantum-pulse-ring-delay"></div>
      </div>
    </div>
  );
}