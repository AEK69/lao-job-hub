import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
} from '@react-pdf/renderer';
import { useAppStore } from '@/lib/store';

// Register Lao font
Font.register({
  family: 'NotoSansLao',
  src: 'https://fonts.gstatic.com/s/notosanslao/v28/H4gQRYx7bJagXQ52f3O5HLB_8xF4rl6K.ttf',
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSansLao',
    backgroundColor: '#fff',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#185FA5',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#185FA5',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#185FA5',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 20,
  },
  summaryBox: {
    padding: 10,
    border: '1px solid #ddd',
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#185FA5',
  },
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
    padding: 4,
    textAlign: 'center' as const,
    fontSize: 9,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tableCell: {
    padding: 4,
    fontSize: 9,
    borderWidth: 1,
    borderColor: '#eee',
    borderRightWidth: 1,
  },
  tableRow: {
    display: 'flex',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  footerText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  methodSummary: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  methodBox: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  methodLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  methodValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#185FA5',
  },
});

interface MonthlyReportData {
  month: string;
  year: string;
  totalPayments: number;
  totalRevenue: number;
  completedJobs: number;
  cancelledJobs: number;
  pendingJobs: number;
  cashPayments: number;
  bcelPayments: number;
  bankPayments: number;
  details: Array<{
    date: string;
    jobNumber: string;
    customer: string;
    amount: number;
    method: string;
  }>;
}

interface MonthlyReportDocumentProps {
  data: MonthlyReportData;
}

export const MonthlyReportDocument: React.FC<MonthlyReportDocumentProps> = ({ data }) => {
  const t = (lo: string, en: string) => lo;

  const monthNames = [
    'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶษະພາ', 'ມິຖຸນາ',
    'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'
  ];

  const monthName = monthNames[parseInt(data.month) - 1];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ລາຍງານປະຈຳເດືອນ WorkDay</Text>
          <Text style={styles.subtitle}>
            {monthName} {data.year} / Monthly Report
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.section}>
          <View style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
            <View style={[styles.summaryBox, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>ລາຍຮັບທັງໝົດ</Text>
              <Text style={styles.summaryValue}>{data.totalRevenue.toLocaleString('en-US')} ກີບ</Text>
            </View>
            <View style={[styles.summaryBox, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>ຈຳນວນການຊຳລະ</Text>
              <Text style={styles.summaryValue}>{data.totalPayments}</Text>
            </View>
            <View style={[styles.summaryBox, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>ງານສຳເລັດ</Text>
              <Text style={styles.summaryValue}>{data.completedJobs}</Text>
            </View>
            <View style={[styles.summaryBox, { flex: 1 }]}>
              <Text style={styles.summaryLabel}>ງານກຳລັງດຳເນີນ</Text>
              <Text style={styles.summaryValue}>{data.pendingJobs}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ສະຫຼຸບຕາມວິທີຈ່າຍ</Text>
          <View style={styles.methodSummary}>
            <View style={styles.methodBox}>
              <Text style={styles.methodLabel}>ເງິນສົດ</Text>
              <Text style={styles.methodValue}>{data.cashPayments.toLocaleString('en-US')} ກີບ</Text>
            </View>
            <View style={styles.methodBox}>
              <Text style={styles.methodLabel}>BCEL One</Text>
              <Text style={styles.methodValue}>{data.bcelPayments.toLocaleString('en-US')} ກີບ</Text>
            </View>
            <View style={styles.methodBox}>
              <Text style={styles.methodLabel}>ໂອນທະນາຄານ</Text>
              <Text style={styles.methodValue}>{data.bankPayments.toLocaleString('en-US')} ກີບ</Text>
            </View>
          </View>
        </View>

        {/* Detailed Payment Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ລາຍລະອຽດການຊຳລະ</Text>
          <View style={styles.table}>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <View style={[styles.tableHeader, { flex: 1 }]}>
                <Text>ວັນທີ</Text>
              </View>
              <View style={[styles.tableHeader, { flex: 1.2 }]}>
                <Text>ເລກທີ່</Text>
              </View>
              <View style={[styles.tableHeader, { flex: 2 }]}>
                <Text>ລູກຄ້າ</Text>
              </View>
              <View style={[styles.tableHeader, { flex: 1 }]}>
                <Text>ຈຳນວນ</Text>
              </View>
              <View style={[styles.tableHeader, { flex: 1 }]}>
                <Text>ວິທີ</Text>
              </View>
            </View>
            {data.details.map((item, idx) => (
              <View key={idx} style={{ display: 'flex', flexDirection: 'row' }}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.date}</Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>{item.jobNumber}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.customer}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {item.amount.toLocaleString('en-US')}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.method}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>WorkDay - Job Management System</Text>
          <Text style={styles.footerText}>
            ສ້າງຕັ້ງເມື່ອ: {new Date().toLocaleDateString('lo-LA')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
