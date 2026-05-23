import { useLogin } from '@refinedev/core';
import { Button, Card, Form, Input, Layout, Typography, Alert, App } from 'antd';
import { DropboxOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useEffect } from 'react';

const { Title, Text } = Typography;

export function Login() {
  const { mutate: login, isLoading, isError, error } = useLogin();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  // Show a message when error occurs as a backup to the Alert
  useEffect(() => {
    if (isError && error) {
      message.error(error.message || '登录失败');
    }
  }, [isError, error, message]);

  const handleSubmit = (values: any) => {
    login(values);
  };

  return (
    <Layout style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '24px'
    }}>
      <Card 
        style={{ 
          width: 400, 
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          border: 'none',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 64, 
            height: 64, 
            background: '#111827', 
            borderRadius: '12px',
            marginBottom: 16,
            boxShadow: '0 8px 16px rgba(17, 24, 39, 0.2)'
          }}>
            <DropboxOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>Dday MES Lite</Title>
          <Text type="secondary">企业供应链与生产执行系统</Text>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
        >
          {isError && (
            <Alert
              style={{ marginBottom: 24, borderRadius: '8px' }}
              message={error?.message || '用户名或密码不正确'}
              type="error"
              showIcon
            />
          )}

          <Form.Item
            name="username"
            label={<Text strong>用户名</Text>}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} 
              size="large" 
              placeholder="admin"
              style={{ borderRadius: '8px' }}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            label={<Text strong>密码</Text>}
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} 
              size="large" 
              placeholder="••••••••"
              style={{ borderRadius: '8px' }}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>
          
          <div style={{ marginTop: 8 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              block 
              loading={isLoading}
              style={{ 
                height: '48px', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: 600,
                background: '#111827',
                border: 'none',
                marginTop: '16px'
              }}
            >
              登 录
            </Button>
          </div>
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            © {new Date().getFullYear()} Antigravity MES 系统
          </Text>
        </div>
      </Card>
    </Layout>
  );
}

