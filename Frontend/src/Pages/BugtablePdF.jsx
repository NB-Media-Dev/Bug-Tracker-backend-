import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 24, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#64748b', marginBottom: 16 },
  
  
  table: { display: 'table', width: 'auto', borderStyle: 'solid', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  
 
  tableRow: { flexDirection: 'row', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, alignItems: 'center', minHeight: 28 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, alignItems: 'center', minHeight: 30 },

  colId: { width: '10%', paddingLeft: 6 },
  colTitle: { width: '25%', paddingLeft: 6 },
  colProject: { width: '13%', paddingLeft: 6 },
  colTester: { width: '12%', paddingLeft: 6 },
  colDev: { width: '12%', paddingLeft: 6 },
  colLevel: { width: '10%', paddingLeft: 6 },
  colStatus: { width: '10%', paddingLeft: 6 },
  colDate: { width: '13%', paddingLeft: 6 },


  headerText: { fontSize: 9, fontWeight: 'bold', color: '#475569' },
  cellText: { fontSize: 9, color: '#334155' },
  monoText: { fontSize: 8, fontFamily: 'Courier', color: '#64748b' },
  
  
  badgeText: { fontSize: 8, fontWeight: 'medium', color: '#1e293b' }
});

export const BugtablePDF = ({ bugList }) => (
  <Document>
   
    <Page size="A4" orientation="landscape" style={styles.page}>
      
   
      <Text style={styles.title}>Project Bug Tracker Summary Report</Text>
      <Text style={styles.subtitle}>Generated Asset Log • Total Records: {bugList.length}</Text>

      
      <View style={styles.table}>
        
      
        <View style={styles.tableHeaderRow}>
          <View style={styles.colId}><Text style={styles.headerText}>ID</Text></View>
          <View style={styles.colTitle}><Text style={styles.headerText}>Bug Title</Text></View>
          <View style={styles.colProject}><Text style={styles.headerText}>Project</Text></View>
          <View style={styles.colTester}><Text style={styles.headerText}>Tester</Text></View>
          <View style={styles.colDev}><Text style={styles.headerText}>Developer</Text></View>
          <View style={styles.colLevel}><Text style={styles.headerText}>Level</Text></View>
          <View style={styles.colStatus}><Text style={styles.headerText}>Status</Text></View>
          <View style={styles.colDate}><Text style={styles.headerText}>Assigned On</Text></View>
        </View>

     
        {bugList.length === 0 ? (
          <View style={[styles.tableRow, { justifyContent: 'center', padding: 20 }]}>
            <Text style={[styles.cellText, { fontStyle: 'italic', color: '#94a3b8' }]}>
              No issues match your search query.
            </Text>
          </View>
        ) : (
          bugList.map((bug, index) => (
            <View 
              key={bug.id} 
              style={[
                styles.tableRow, 
                index === bugList.length - 1 ? { borderBottomWidth: 0 } : {}
              ]}
            >
              <View style={styles.colId}><Text style={styles.monoText}>{bug.id}</Text></View>
              <View style={styles.colTitle}><Text style={styles.cellText}>{bug.title}</Text></View>
              <View style={styles.colProject}><Text style={styles.cellText}>{bug.project}</Text></View>
              <View style={styles.colTester}><Text style={styles.cellText}>{bug.tester}</Text></View>
              <View style={styles.colDev}><Text style={styles.cellText}>{bug.developer}</Text></View>
              <View style={styles.colLevel}><Text style={styles.badgeText}>{bug.severity}</Text></View>
              <View style={styles.colStatus}><Text style={styles.badgeText}>{bug.status}</Text></View>
              <View style={styles.colDate}><Text style={styles.cellText}>{bug.Assigned_On}</Text></View>
            </View>
          ))
        )}
      </View>
    </Page>
  </Document>
);
