import { useEffect, useMemo, useState } from "react";
import { Apis } from "../api";
import type { Staff, WorkLog } from "../api";
import {
  Avatar,
  Badge,
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
  Statistic,
  Alert,
  Tag,
  TimePicker,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CalculatorOutlined,
  CalendarOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

type SelectedDay = {
  date: Dayjs;
  totalHours?: number;
};

export default function TimekeepingPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [dailyMap, setDailyMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<number>(0);

  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [form] = Form.useForm();
  const [dayLogs, setDayLogs] = useState<WorkLog[]>([]);
  const [dayLogsLoading, setDayLogsLoading] = useState(false);
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
  }, []);

  // Đồng bộ tạm ứng khi đổi nhân viên
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
  const dailyTargetHours = 8;
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

  function setEndByDuration(hours: number) {
    const start = dayjs(`2000-01-01 ${startTime}`, "YYYY-MM-DD HH:mm");
    const end = start.add(hours, "hour");
    const endStr = end.format("HH:mm");
    setEndTime(endStr == "00:00" ? "24:00" : endStr);
  }

  function openDayModal(day: number) {
    const date = currentMonth.date(day);
    setSelectedDay({ date, totalHours: dailyMap[date.format("YYYY-MM-DD")] });
    setTimeModalOpen(true);
    if (!selectedStaff) return;
    setDayLogs([]);
    setDayLogsLoading(true);
    Apis.workLogs
      .listByDate(selectedStaff.id, date.format("YYYY-MM-DD"))
      .then((logs) => setDayLogs(logs))
      .finally(() => setDayLogsLoading(false));
  }

  async function handleSaveWorklog() {
    if (!selectedStaff || !selectedDay) return;
    
    // Validate startTime and endTime
    if (!startTime || !endTime || startTime.trim() === "" || endTime.trim() === "") {
      message.error("Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc");
      return;
    }
    
    const dateStr = selectedDay.date.format("YYYY-MM-DD");
    try {
      // Đảm bảo endTime luôn có giá trị hợp lệ
      let safeEndTime = endTime.trim();
      if (safeEndTime === "24:00") {
        safeEndTime = "23:59";
      }
      
      // Kiểm tra lại format HH:mm
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
      // refresh monthly
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
      // Fallback: tính tại FE từ dữ liệu đã tải
      message.info(`Tổng giờ: ${totalHoursInMonth} | Lương: ${totalSalary}`);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 20%, #0f172a 0%, #020617 40%, #05001d 100%)",
        overflow: "hidden",
        paddingBottom: 80,
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "100%",
            background: "rgba(56, 189, 248, 0.25)",
            filter: "blur(160px)",
            top: -140,
            right: -160,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "100%",
            background: "rgba(129, 140, 248, 0.22)",
            filter: "blur(160px)",
            bottom: -180,
            left: -120,
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1340, margin: "0 auto", padding: "56px 24px 0" }}>
        <Flex vertical gap={32}>
          <div
            style={{
              borderRadius: 28,
              padding: "36px 40px",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.82) 0%, rgba(30,64,175,0.62) 58%, rgba(14,165,233,0.45) 100%)",
              border: "1px solid rgba(59,130,246,0.35)",
              boxShadow: "0 50px 130px -68px rgba(56,189,248,0.85)",
              backdropFilter: "blur(26px)",
            }}
          >
            <Flex align="center" justify="space-between" wrap gap={32}>
              <Space direction="vertical" size={16} style={{ maxWidth: 520 }}>
                <Tag color="processing" icon={<ThunderboltOutlined />} style={{ width: "fit-content" }}>
                  Phân tích theo thời gian thực
                </Tag>
                <Title level={2} style={{ color: "#f8fafc", marginBottom: 0 }}>
                  Bảng điều khiển chấm công thế hệ mới
                </Title>
                <Text style={{ color: "rgba(241,245,249,0.72)" }}>
                  Tối ưu năng suất với các chỉ số trực quan, dự báo lương và hành động nhanh trong một màn hình duy nhất.
                </Text>
                <Space wrap>
                  <Button
                    type="primary"
                    className="btn-aurora"
                    icon={<CalculatorOutlined />}
                    onClick={handleCalculateSalary}
                    disabled={!selectedStaff}
                  >
                    Tính lương tức thì
                  </Button>
                  <Button className="btn-aurora" icon={<UserAddOutlined />} onClick={() => setAddStaffOpen(true)}>
                    Thêm nhân sự
                  </Button>
                  <Button
                    type="link"
                    icon={<LineChartOutlined />}
                    style={{ color: "#38bdf8" }}
                    onClick={() => message.info("Báo cáo chuyên sâu sắp ra mắt")}
                  >
                    Xem phân tích chuyên sâu
                  </Button>
                </Space>
              </Space>

              <Space size={32} align="center" wrap>
                <Progress
                  type="dashboard"
                  percent={completionPercent}
                  size={170}
                  strokeWidth={12}
                  strokeColor={{ from: "#22d3ee", to: "#6366f1" }}
                  trailColor="rgba(148,163,184,0.18)"
                  gapDegree={10}
                />
                <Space direction="vertical" size={4}>
                  <Statistic
                    title="Giờ cần hoàn thành"
                    value={targetHours}
                    suffix="giờ"
                    precision={0}
                    valueStyle={{ color: "#e0f2fe" }}
                  />
                  <Statistic
                    title="Giờ còn thiếu"
                    value={remainingHours}
                    suffix="giờ"
                    precision={2}
                    valueStyle={{ color: remainingHours === 0 ? "#34d399" : "#fbbf24" }}
                  />
                </Space>
              </Space>
            </Flex>
          </div>

          <Flex gap={16} wrap="wrap">
            <Card
              style={{
                flex: "1 1 260px",
                borderRadius: 20,
                border: "1px solid rgba(59,130,246,0.25)",
                background: "linear-gradient(145deg, rgba(30,41,59,0.85) 0%, rgba(46,16,101,0.65) 100%)",
                boxShadow: "0 35px 80px -60px rgba(129,140,248,0.85)",
                color: "#e2e8f0",
              }}
              headStyle={{ color: "#cbd5f5" }}
            >
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Statistic
                  title={<Text style={{ color: "rgba(226,232,240,0.7)" }}>Tổng giờ trong tháng</Text>}
                  value={Number(totalHoursInMonth.toFixed(2))}
                  suffix="giờ"
                  precision={2}
                  valueStyle={{ color: "#fef9c3" }}
                />
                <Progress
                  percent={completionPercent}
                  strokeColor={{ from: "#f97316", to: "#facc15" }}
                  trailColor="rgba(148,163,184,0.2)"
                  showInfo={false}
                  style={{ width: "100%" }}
                />
                <Flex justify="space-between" align="center">
                    <Text style={{ color: "rgba(226,232,240,0.7)" }}>Mục tiêu tháng</Text>
                  <Tag color={completionPercent >= 100 ? "green" : completionPercent >= 60 ? "geekblue" : "gold"}>
                    {targetHours} giờ
                  </Tag>
                </Flex>
              </Space>
            </Card>

            <Card
              style={{
                flex: "1 1 260px",
                borderRadius: 20,
                border: "1px solid rgba(45,212,191,0.25)",
                background: "linear-gradient(145deg, rgba(15,118,110,0.82) 0%, rgba(20,184,166,0.68) 100%)",
                boxShadow: "0 35px 80px -60px rgba(45,212,191,0.75)",
                color: "#ecfeff",
              }}
            >
              <Space direction="vertical" size={18}>
                <Statistic
                  title={<Text style={{ color: "rgba(240,253,250,0.75)" }}>Tổng lương dự kiến</Text>}
                  value={totalSalary}
                  suffix="đ"
                  precision={0}
                  valueStyle={{ color: "#f8fafc" }}
                />
                <Text style={{ fontSize: 22, fontWeight: 600 }}>{formattedNet}</Text>
                <Tag color="cyan" style={{ width: "fit-content" }}>
                  Sau tạm ứng {formattedAdvance}
                </Tag>
              </Space>
            </Card>

            <Card
              style={{
                flex: "1 1 260px",
                borderRadius: 20,
                border: "1px solid rgba(56,189,248,0.25)",
                background: "linear-gradient(145deg, rgba(15,23,42,0.85) 0%, rgba(51,65,85,0.75) 100%)",
                boxShadow: "0 35px 80px -60px rgba(30,64,175,0.7)",
                color: "#e2e8f0",
              }}
            >
              <Space direction="vertical" size={16}>
                <Statistic
                    title={<Text style={{ color: "rgba(226,232,240,0.7)" }}>Tạm ứng hiện tại</Text>}
                  value={advanceAmount}
                  suffix="đ"
                  precision={0}
                  valueStyle={{ color: "#bae6fd" }}
                />
                <Text style={{ fontSize: 18 }}>
                  Thực nhận dự kiến: <strong>{formattedNet}</strong>
                </Text>
                <Text type="secondary" style={{ color: "rgba(226,232,240,0.65)" }}>
                  Tận dụng dữ liệu để cân đối ngân sách và kế hoạch thường.
                </Text>
              </Space>
            </Card>
          </Flex>

          <Flex gap={24} align="stretch" wrap>
            <Card
              title="Nhân viên"
              size="small"
              style={{
                flex: "0 0 340px",
                borderRadius: 22,
                border: "1px solid rgba(59,130,246,0.25)",
                background: "rgba(15,23,42,0.72)",
                boxShadow: "0 45px 90px -60px rgba(59,130,246,0.75)",
                color: "#e2e8f0",
              }}
              bodyStyle={{ padding: 24 }}
              extra={
                <Button type="primary" className="btn-aurora" onClick={() => setAddStaffOpen(true)} icon={<UserAddOutlined />}>
                  Thêm nhân viên
                </Button>
              }
            >
              <List
                dataSource={staffList}
                loading={loading && !selectedStaff}
                locale={{ emptyText: "Chưa có nhân viên" }}
                renderItem={(item) => {
                  const isActive = selectedStaff?.id === item.id;
                  const initials = (item.name || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("");
                  return (
                    <List.Item
                      style={{
                        cursor: "pointer",
                        borderRadius: 16,
                        padding: "12px 16px",
                        marginBottom: 10,
                        background: isActive
                          ? "linear-gradient(135deg, rgba(56,189,248,0.25) 0%, rgba(37,99,235,0.25) 100%)"
                          : "rgba(30,41,59,0.62)",
                        boxShadow: isActive ? "0 18px 38px -26px rgba(56,189,248,0.9)" : undefined,
                        border: isActive ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(71,85,105,0.45)",
                        transition: "all 0.25s ease",
                      }}
                      onClick={() => {
                        setSelectedStaff(item);
                        setAdvanceAmount(Number(item.advanceAmount || 0));
                      }}
                    >
                      <Space align="center" size={14}>
                        <Badge dot={isActive} color="cyan">
                          <Avatar style={{ background: "linear-gradient(135deg,#3b82f6,#06b6d4)" }}>{initials}</Avatar>
                        </Badge>
                        <Space direction="vertical" size={4}>
                          <Text strong style={{ color: "#f8fafc" }}>
                            {item.name ?? `#${item.id}`}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12, color: "rgba(226,232,240,0.65)" }}>
                            Tạm ứng: {currencyFormatter.format(Number(item.advanceAmount || 0))}
                          </Text>
                        </Space>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Card>

            <Flex vertical gap={20} style={{ minWidth: 0, flex: 1 }}>
              <Card
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(71,85,105,0.45)",
                  background: "rgba(15,23,42,0.75)",
                  boxShadow: "0 45px 90px -68px rgba(15,118,110,0.65)",
                }}
                bodyStyle={{ padding: 28 }}
              >
                <Flex vertical gap={20}>
                  <Flex gap={18} wrap align="center">
                    <Space direction="vertical" size={4}>
                      <Text type="secondary" style={{ color: "rgba(226,232,240,0.7)" }}>
                        Tháng
                      </Text>
                      <DatePicker
                        picker="month"
                        value={currentMonth}
                        onChange={(v) => v && setCurrentMonth(v)}
                        allowClear={false}
                        style={{ width: 200 }}
                      />
                    </Space>

                    <Divider type="vertical" style={{ height: 54 }} />

                    <Space direction="vertical" size={4}>
                      <Text type="secondary" style={{ color: "rgba(226,232,240,0.7)" }}>
                        Mức lương / giờ
                      </Text>
                      <InputNumber
                        className="input-neo"
                        min={0}
                        value={hourlyRate}
                        onChange={(v) => setHourlyRate(Number(v || 0))}
                        style={{ width: 180 }}
                      />
                    </Space>

                    <Space direction="vertical" size={4}>
                      <Text type="secondary" style={{ color: "rgba(226,232,240,0.7)" }}>
                        Tạm ứng
                      </Text>
                      <InputNumber
                        className="input-neo"
                        min={0}
                        value={advanceAmount}
                        onChange={(v) => setAdvanceAmount(Number(v || 0))}
                        style={{ width: 220 }}
                        addonAfter={
                          <Button
                            type="link"
                            style={{ padding: 0 }}
                            onClick={async () => {
                              if (!selectedStaff) return;
                              try {
                                const updated = await Apis.staff.updateAdvance(selectedStaff.id, advanceAmount);
                                setSelectedStaff(updated);
                                setAdvanceAmount(Number(updated.advanceAmount || 0));
                                message.success("Đã cập nhật tạm ứng");
                              } catch {
                                message.error("Cập nhật tạm ứng thất bại");
                              }
                            }}
                          >
                            Lưu
                          </Button>
                        }
                      />
                    </Space>

                    <Button
                      type="primary"
                      className="btn-aurora"
                      icon={<ThunderboltOutlined />}
                      onClick={handleCalculateSalary}
                      disabled={!selectedStaff}
                      style={{ marginLeft: "auto" }}
                    >
                      Tính lương nhanh
                    </Button>
                  </Flex>

                  <Flex gap={16} wrap>
                    <Tag color="cyan">Tổng giờ: {totalHoursInMonth} giờ</Tag>
                    <Tag color="purple">Tổng lương: {formattedSalary}</Tag>
                    <Tag color="green">Thực nhận: {formattedNet}</Tag>
                    <Tooltip title={`Tạm ứng đã ghi nhận: ${formattedAdvance}`}>
                      <Tag color="gold">Tạm ứng: {formattedAdvance}</Tag>
                    </Tooltip>
                  </Flex>

                  <Divider style={{ margin: "8px 0 16px", borderColor: "rgba(148,163,184,0.25)" }} />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: 18,
                    }}
                  >
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
                          style={{
                            borderRadius: 18,
                            border: "1px solid rgba(94, 234, 212, 0.18)",
                            background: isToday
                              ? "linear-gradient(135deg, rgba(56,189,248,0.25) 0%, rgba(14,165,233,0.25) 100%)"
                              : "rgba(15,23,42,0.65)",
                            boxShadow: isToday
                              ? "0 25px 55px -40px rgba(56,189,248,0.95)"
                              : "0 18px 45px -38px rgba(12,74,110,0.6)",
                            transition: "all 0.25s ease",
                          }}
                          bodyStyle={{ padding: 18 }}
                        >
                          <Flex vertical gap={12}>
                            <Flex align="center" justify="space-between">
                              <Text strong style={{ fontSize: 20, color: "#f8fafc" }}>
                                {day}
                              </Text>
                              <Space>
                                  {isWeekend && <Tag color="default">Cuối tuần</Tag>}
                                {isToday && <Tag color="blue">Hôm nay</Tag>}
                              </Space>
                            </Flex>
                            <Space direction="vertical" size={4}>
                              <Text type="secondary" style={{ color: "rgba(226,232,240,0.7)" }}>
                                {date.format("ddd, DD/MM")}
                              </Text>
                              <Text style={{ color: overtime ? "#facc15" : hours > 0 ? "#34d399" : "rgba(226,232,240,0.6)" }}>
                                {hours > 0 ? `${hours} giờ` : "Chưa có"}
                              </Text>
                            </Space>
                            <Progress
                              percent={dayPercent}
                              strokeWidth={6}
                              showInfo={false}
                              strokeColor={overtime ? "#f59e0b" : "#34d399"}
                              trailColor="rgba(148,163,184,0.25)"
                            />
                            {overtime && (
                              <Tag color="magenta" style={{ width: "fit-content" }}>
                                +{Number((hours - dailyTargetHours).toFixed(2))} giờ ngoài giờ
                              </Tag>
                            )}
                          </Flex>
                        </Card>
                      );
                    })}
                  </div>
                </Flex>
              </Card>
            </Flex>
          </Flex>
        </Flex>
      </div>

      <FloatButton.Group
        shape="circle"
        trigger="hover"
        style={{ right: 28, bottom: 28 }}
        icon={<ThunderboltOutlined />}
      >
        <FloatButton
          icon={<UserAddOutlined />}
          description="Thêm nhân viên"
          onClick={() => setAddStaffOpen(true)}
        />
        <FloatButton
          icon={<CalculatorOutlined />}
          description="Tính lương tháng"
          onClick={handleCalculateSalary}
        />
        <FloatButton
          icon={<CalendarOutlined />}
          description="Về tháng hiện tại"
          onClick={() => setCurrentMonth(dayjs())}
        />
      </FloatButton.Group>

      <Modal
        className="modal-aurora"
        title={selectedDay ? `Nhập giờ công - ${selectedDay.date.format("DD/MM/YYYY")}` : "Nhập giờ công"}
        open={timeModalOpen}
        onCancel={() => setTimeModalOpen(false)}
        onOk={handleSaveWorklog}
        okText="Lưu"
        cancelText="Hủy"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <Alert
            type="info"
            message="Gợi ý"
            description="Dùng các chip thời lượng để đặt giờ kết thúc nhanh theo số giờ làm."
            showIcon
          />
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
            <Card className="card-hover" styles={{ body: { padding: 16 } }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Typography.Text>Giờ bắt đầu</Typography.Text>
                  <TimePicker
                    className="time-neo"
                    dropdownClassName="time-neo-dropdown"
                    value={dayjs(startTime, "HH:mm")}
                    format="HH:mm"
                    use12Hours={false}
                    minuteStep={5}
                    style={{ width: "100%" }}
                    onChange={(v) => setStartTime(v ? v.format("HH:mm") : "00:00")}
                  />
                </div>
                <div>
                  <Typography.Text>Giờ kết thúc</Typography.Text>
                  <TimePicker
                    className="time-neo"
                    dropdownClassName="time-neo-dropdown"
                    value={endTime === "24:00" ? dayjs("23:59", "HH:mm") : dayjs(endTime, "HH:mm")}
                    format="HH:mm"
                    use12Hours={false}
                    minuteStep={5}
                    style={{ width: "100%" }}
                    onChange={(v) => {
                      if (v) {
                        setEndTime(v.format("HH:mm"));
                      } else {
                        // Nếu người dùng xóa, giữ giá trị mặc định thay vì "00:00"
                        setEndTime("18:00");
                      }
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Typography.Text type="secondary">Chọn nhanh ca làm</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Button size="small" className="btn-aurora" onClick={() => { setStartTime("17:00"); setEndTime("22:00"); }}>Ca 1 (17:00-22:00)</Button>
                    <Button size="small" className="btn-aurora" onClick={() => { setStartTime("17:00"); setEndTime("21:00"); }}>Ca 2 (17:00-21:00)</Button>
                    <Button size="small" className="btn-aurora" onClick={() => { setStartTime("17:00"); setEndTime("20:00"); }}>Ca 3 (17:00-20:00)</Button>
                  </Space>
                </div>
              </div>
              <div style={{ marginTop: 12 }} className="chips">
                {[4, 6, 8, 10, 12].map((h) => (
                  <div
                    key={h}
                    className={`chip ${Math.round(durationHours) === h ? "chip-active" : ""}`}
                    onClick={() => setEndByDuration(h)}
                  >
                    +{h} giờ từ bắt đầu
                  </div>
                ))}
                <div className="chip" onClick={() => setEndTime("24:00")}>Đặt 24:00</div>
              </div>
            </Card>
            <Card className="card-hover" styles={{ body: { padding: 16 } }}>
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Statistic title="Số giờ nhập" value={durationHours} precision={2} suffix="giờ" />
                <Progress
                  percent={Math.min(100, Math.round((durationHours / dailyTargetHours) * 100))}
                  strokeColor={durationHours > dailyTargetHours ? "#f59e0b" : "#34d399"}
                />
                <Typography.Text type="secondary">
                  Mục tiêu ngày: {dailyTargetHours} giờ · {durationHours > dailyTargetHours ? `Ngoài giờ: +${Number((durationHours - dailyTargetHours).toFixed(2))}h` : `Còn thiếu: ${Number((Math.max(0, dailyTargetHours - durationHours)).toFixed(2))}h`}
                </Typography.Text>
              </Space>
            </Card>
          </div>
          <div>
            <Typography.Text strong>Nhật ký ngày</Typography.Text>
            <div style={{ marginTop: 8 }}>
              {dayLogsLoading ? (
                <Typography.Text>Đang tải...</Typography.Text>
              ) : dayLogs.length === 0 ? (
                <Typography.Text type="secondary">Chưa có ghi nhận</Typography.Text>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {dayLogs.map((log) => (
                    <Card key={log.id} size="small" className="card-hover" styles={{ body: { padding: 10 } }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space>
                          <Tag color="blue">{log.startTime}</Tag>
                          <span>-</span>
                          <Tag color="geekblue">{log.endTime}</Tag>
                        </Space>
                        <Tag color={log.durationHours > dailyTargetHours ? "orange" : "green"}>{log.durationHours} giờ</Tag>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title="Thêm nhân viên"
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
            message.success("Đã thêm nhân viên");
          } catch {
            // validation or API error
          }
        }}
        okText="Thêm"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên nhân viên" rules={[{ required: true, message: "Nhập tên" }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}