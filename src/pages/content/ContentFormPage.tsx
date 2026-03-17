import { message, Button, Form, Input, Select, Space, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';

function ContentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  // 有 id 说明当前页面是“编辑模式”，没有 id 则视为“新增模式”。
  const isEdit = Boolean(id);

  return (
    <PageContainer
      description="内容新增与编辑共用同一套表单骨架。"
      title={isEdit ? '编辑内容' : '新增内容'}
    >
      <Form
        layout="vertical"
        onFinish={() => {
          // 当前骨架只把提交后的交互链路跑通。
          // 后续接真实接口时，可以在这里根据 isEdit 选择 create / update 方法。
          message.success(isEdit ? '内容更新成功' : '内容创建成功');
          navigate('/content/list');
        }}
      >
        <Form.Item
          label="内容标题"
          name="title"
          rules={[{ required: true, message: '请输入内容标题' }]}
        >
          <Input placeholder="请输入内容标题" />
        </Form.Item>
        <Form.Item
          label="内容分类"
          name="category"
          rules={[{ required: true, message: '请选择内容分类' }]}
        >
          <Select
            options={[
              { label: '专题内容', value: '专题内容' },
              { label: '运营稿件', value: '运营稿件' },
              { label: '数据内容', value: '数据内容' },
            ]}
            placeholder="请选择内容分类"
          />
        </Form.Item>
        <Form.Item
          label="正文摘要"
          name="summary"
          rules={[{ required: true, message: '请输入摘要' }]}
        >
          <Input.TextArea placeholder="请输入摘要" rows={6} />
        </Form.Item>
        <Form.Item label="发布状态" name="published" valuePropName="checked">
          {/* Switch 组件绑定的是 checked 字段，因此这里必须用 valuePropName 指定。 */}
          <Switch checkedChildren="发布" unCheckedChildren="草稿" />
        </Form.Item>
        <Space>
          <Button htmlType="submit" type="primary">
            {isEdit ? '保存修改' : '提交内容'}
          </Button>
          {/* 当前取消行为直接回列表，后续可以在这里接“未保存离开提醒”。 */}
          <Button onClick={() => navigate('/content/list')}>取消</Button>
        </Space>
      </Form>
    </PageContainer>
  );
}

export default ContentFormPage;
