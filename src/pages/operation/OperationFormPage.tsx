import { DatePicker, message, Button, Form, Input, Select, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';

function OperationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  return (
    <PageContainer
      description="活动新增与编辑共用表单结构，方便后续继续扩展业务字段。"
      title={isEdit ? '编辑活动' : '新增活动'}
    >
      <Form
        layout="vertical"
        onFinish={() => {
          message.success(isEdit ? '活动更新成功' : '活动创建成功');
          navigate('/operation/list');
        }}
      >
        <Form.Item
          label="活动名称"
          name="name"
          rules={[{ required: true, message: '请输入活动名称' }]}
        >
          <Input placeholder="请输入活动名称" />
        </Form.Item>
        <Form.Item
          label="活动类型"
          name="type"
          rules={[{ required: true, message: '请选择活动类型' }]}
        >
          <Select
            options={[
              { label: '拉新活动', value: '拉新活动' },
              { label: '促活活动', value: '促活活动' },
              { label: '内容活动', value: '内容活动' },
            ]}
            placeholder="请选择活动类型"
          />
        </Form.Item>
        <Form.Item
          label="活动周期"
          name="period"
          rules={[{ required: true, message: '请选择活动周期' }]}
        >
          <DatePicker.RangePicker className="full-width" />
        </Form.Item>
        <Form.Item
          label="活动说明"
          name="remark"
          rules={[{ required: true, message: '请输入活动说明' }]}
        >
          <Input.TextArea placeholder="请输入活动说明" rows={6} />
        </Form.Item>
        <Space>
          <Button htmlType="submit" type="primary">
            {isEdit ? '保存修改' : '创建活动'}
          </Button>
          <Button onClick={() => navigate('/operation/list')}>取消</Button>
        </Space>
      </Form>
    </PageContainer>
  );
}

export default OperationFormPage;
