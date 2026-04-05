import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

Font.register({
  family: 'NotoSansLao',
  src: 'https://fonts.gstatic.com/s/notosanslao/v28/H4gQRYx7bJagXQ52f3O5HLB_8xF4rl6K.ttf',
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSansLao', backgroundColor: '#fff', fontSize: 10 },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#185FA5', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#185FA5', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#185FA5', marginBottom: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  summaryBox: { padding: 10, border: '1px solid #ddd', borderRadius: 4 },
  summaryLabel: { fontSize: 9, color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#185FA5' },
  tableHeader: { backgroundColor: '#E8E8E8', fontWeight: 'bold', padding: 4, textAlign: 'center' as const, fontSize: 9, borderWidth: 1, borderColor: '#ccc' },
  tableCell: { padding: 4, fontSize: 9, borderWidth: 1, borderColor: '#eee' },
  footer: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ccc' },
  footerText: { fontSize: 8, color: '#666', textAlign: 'center' },
  methodSummary: { display: 'flex', flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 },
  methodBox: { flexDirection: 'column', alignItems: 'center' },
  methodLabel: { fontSize: 9, color: '#666', marginBottom: 4 },
  methodValue: { fontSize: 12, fontWeight: 'bold', color: '#185FA5' },
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
  details: Array<{ date: string; jobNumber: string; customer: string; amount: number; method: string }>;
}

export const MonthlyReportDocument: React.FC<{ data: MonthlyReportData }> = ({ data }) => {
  const monthNames = ['ມັງກອນ','ກຸມພາ','ມີນາ','ເມສາ','ພຶສະພາ','ມິຖຸນາ','ກໍລະກົດ','ສິງຫາ','ກັນຍາ','ຕຸລາ','ພະຈິກ','ທັນວາ'];
  const monthName = monthNames[parseInt(data.month) - 1];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>ລາຍງານປະຈຳເດືອນ WorkDay</Text>
          <Text style={styles.subtitle}>{monthName} {data.year}</Text>
        </View>
        <View style={styles.section}>
          <View style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'ລາຍຮັບທັງໝົດ', value: `${data.totalRevenue.toLocaleString('en-US')} ກີບ` },
              { label: 'ຈຳນວນການຊຳລະ', value: String(data.totalPayments) },
              { label: 'ງານສຳເລັດ', value: String(data.completedJobs) },
              { label: 'ງານກຳລັງດຳເນີນ', value: String(data.pendingJobs) },
            ].map((item, i) => (
              <View key={i} style={[styles.summaryBox, { flex: 1 }]}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ສະຫຼຸບຕາມວິທີຈ່າຍ</Text>
          <View style={styles.methodSummary}>
            {[
              { label: 'ເງິນສົດ', value: data.cashPayments },
              { label: 'BCEL One', value: data.bcelPayments },
              { label: 'ໂອນທະນາຄານ', value: data.bankPayments },
            ].map((m, i) => (
              <View key={i} style={styles.methodBox}>
                <Text style={styles.methodLabel}>{m.label}</Text>
                <Text style={styles.methodValue}>{m.value.toLocaleString('en-US')} ກີບ</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ລາຍລະອຽດການຊຳລະ</Text>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {['ວັນທີ','ເລກທີ່','ລູກຄ້າ','ຈຳນວນ','ວິທີ'].map((h, i) => (
              <View key={i} style={[styles.tableHeader, { flex: i === 2 ? 2 : i === 1 ? 1.2 : 1 }]}>
                <Text>{h}</Text>
              </View>
            ))}
          </View>
          {data.details.map((item, idx) => (
            <View key={idx} style={{ display: 'flex', flexDirection: 'row' }}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.date}</Text>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>{item.jobNumber}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.customer}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.amount.toLocaleString('en-US')}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.method}</Text>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>WorkDay - Job Management System</Text>
          <Text style={styles.footerText}>ສ້າງຕັ້ງເມື່ອ: {new Date().toLocaleDateString('lo-LA')}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default MonthlyReportDocument;
