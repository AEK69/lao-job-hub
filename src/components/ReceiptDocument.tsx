import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

// Register Lao font (Noto Sans Lao)
// NOTE: You need to download and convert NotoSansLao font to base64 or use a web font
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
    paddingBottom: 15,
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: 10,
    backgroundColor: '#185FA5',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#185FA5',
    marginBottom: 2,
  },
  receiptNumber: {
    fontSize: 9,
    color: '#666',
    marginBottom: 10,
  },
  table: {
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tableLabel: {
    width: 100,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tableValue: {
    flex: 1,
    color: '#1a1a1a',
  },
  separator: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    marginBottom: 10,
  },
  summaryTable: {
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 6,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 10,
    color: '#666',
  },
  summaryValue: {
    width: 80,
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#185FA5',
  },
  totalLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#185FA5',
  },
  totalValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#185FA5',
  },
  paidAmount: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paidLabel: {
    fontWeight: 'bold',
    color: '#856404',
  },
  paidValue: {
    fontWeight: 'bold',
    color: '#856404',
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signatureLine: {
    width: 120,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 9,
  },
  footerNote: {
    fontSize: 8,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  redText: {
    color: '#C53030',
  },
  greenText: {
    color: '#2F855A',
  },
});

interface ReceiptDocumentProps {
  jobNumber: string;
  paymentId: string;
  customerName: string;
  customerPhone: string;
  jobType: string;
  scheduledDate: string;
  basePrice: number;
  materialCost: number;
  discount: number;
  totalPrice: number;
  thisPaymentAmount: number;
  totalPaid: number;
  paymentMethod: string;
  referenceNote?: string;
  receivedByName: string;
  createdAt: string;
}

const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  jobNumber,
  paymentId,
  customerName,
  customerPhone,
  jobType,
  scheduledDate,
  basePrice,
  materialCost,
  discount,
  totalPrice,
  thisPaymentAmount,
  totalPaid,
  paymentMethod,
  referenceNote,
  receivedByName,
  createdAt,
}) => {
  const remaining = totalPrice - totalPaid;
  const receiptNumber = `REC-${jobNumber}-${paymentId.slice(-4).toUpperCase()}`;
  const isPaid = remaining <= 0;

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case 'cash':
        return 'ເງິນສົດ / Cash';
      case 'bcel':
        return 'BCEL One';
      case 'bank_transfer':
        return 'ໂອນທະນາຄານ / Bank Transfer';
      default:
        return paymentMethod;
    }
  };

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>WD</Text>
          </View>
          <Text style={styles.companyName}>WorkDay Services</Text>
          <Text style={styles.receiptTitle}>ໃບຮັບເງິນ / RECEIPT</Text>
          <Text style={styles.receiptNumber}>{receiptNumber}</Text>
        </View>

        {/* Job Information */}
        <View style={styles.table}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8, color: '#185FA5' }}>
            ຂໍ້ມູນງານ / JOB INFORMATION
          </Text>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>ເລກທີ່ງານ:</Text>
            <Text style={styles.tableValue}>{jobNumber}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>ລູກຄ້າ:</Text>
            <Text style={styles.tableValue}>{customerName}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>ເບີໂທ:</Text>
            <Text style={styles.tableValue}>{customerPhone}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>ປະເພດງານ:</Text>
            <Text style={styles.tableValue}>{jobType}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>ວັນທີ່:</Text>
            <Text style={styles.tableValue}>
              {new Date(scheduledDate).toLocaleDateString('lo-LA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Payment Summary */}
        <View style={styles.summaryTable}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8, color: '#185FA5' }}>
            ສະຫຼຸບການຊຳລະ / PAYMENT SUMMARY
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ລາຄາບໍລິການ:</Text>
            <Text style={styles.summaryValue}>
              {basePrice.toLocaleString('en-US')} ກີບ
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ຄ່າວັດສະດຸ:</Text>
            <Text style={styles.summaryValue}>
              {materialCost.toLocaleString('en-US')} ກີບ
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ສ່ວນຫຼຸດ:</Text>
              <Text style={styles.summaryValue}>
                -{discount.toLocaleString('en-US')} ກີບ
              </Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ຍອດລວມ:</Text>
            <Text style={styles.totalValue}>
              {totalPrice.toLocaleString('en-US')} ກີບ
            </Text>
          </View>

          <View style={styles.paidAmount}>
            <Text style={styles.paidLabel}>ຊຳລະຄັ້ງນີ້:</Text>
            <Text style={styles.paidValue}>
              {thisPaymentAmount.toLocaleString('en-US')} ກີບ
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ຊຳລະແລ້ວທັງໝົດ:</Text>
            <Text style={styles.summaryValue}>
              {totalPaid.toLocaleString('en-US')} ກີບ
            </Text>
          </View>

          <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.summaryLabel, isPaid ? styles.greenText : styles.redText]}>
              {isPaid ? 'ຊຳລະຄົບ' : 'ຍັງຄ້າງ'}:
            </Text>
            <Text
              style={[
                styles.summaryValue,
                isPaid ? styles.greenText : styles.redText,
                { fontWeight: 'bold' },
              ]}
            >
              {remaining.toLocaleString('en-US')} ກີບ
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Payment Details */}
        <View style={styles.table}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8, color: '#185FA5' }}>
            ລາຍລະອຽດການຊຳລະ / PAYMENT DETAILS
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.tableLabel}>ວິທີຈ່າຍ:</Text>
            <Text style={styles.tableValue}>{getPaymentMethodLabel()}</Text>
          </View>
          {referenceNote && (
            <View style={styles.statusRow}>
              <Text style={styles.tableLabel}>ອ້າງອີງ:</Text>
              <Text style={styles.tableValue}>{referenceNote}</Text>
            </View>
          )}
          <View style={styles.statusRow}>
            <Text style={styles.tableLabel}>ວັນທີ-ເວລາ:</Text>
            <Text style={styles.tableValue}>
              {new Date(createdAt).toLocaleDateString('lo-LA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}{' '}
              {new Date(createdAt).toLocaleTimeString('lo-LA')}
            </Text>
          </View>
          <View style={[styles.statusRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableLabel}>ຮັບໂດຍ:</Text>
            <Text style={styles.tableValue}>{receivedByName}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, marginTop: 4 }}>ລາຍເຊັນລູກຄ້າ</Text>
            <Text style={{ fontSize: 7, color: '#666' }}>Customer Signature</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, marginTop: 4 }}>ລາຍເຊັນຜູ້ຮັບ</Text>
            <Text style={{ fontSize: 7, color: '#666' }}>Receiver Signature</Text>
          </View>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          ໃບຮັບເງິນນີ້ເປັນຫຼັກຖານການຊຳລະເງິນ
        </Text>
        <Text style={styles.footerNote}>
          This receipt is proof of payment
        </Text>
      </Page>
    </Document>
  );
};

export default ReceiptDocument;
