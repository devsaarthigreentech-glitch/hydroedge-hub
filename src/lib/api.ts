// ============================================================================
// API CLIENT - Helper functions for calling backend APIs
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchDevices(customerFilter?: string) {
  try {
    const url = customerFilter && customerFilter !== 'all'
      ? `${API_BASE_URL}/devices?customer_id=${customerFilter}`
      : `${API_BASE_URL}/devices`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch devices');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw error;
  }
}

export async function fetchCustomers() {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch customers');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
}

export async function fetchTelemetry(deviceId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/telemetry/${deviceId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch telemetry');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    throw error;
  }
}