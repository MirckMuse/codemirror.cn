<script lang="ts">
import { PropType, defineComponent, h } from "vue";

interface Feature {
  title: string;

  desc?: string;

  link?: string;
}

export default defineComponent({
  name: "HomeFeature",

  props: {
    feature: { type: Object as PropType<Feature>, required: true },

    titleTag: { type: String, default: "h3" }
  },

  setup(props) {
    return () => {
      const { feature, titleTag } = props;


      const title = h(titleTag, {}, feature.title)
      const desc = feature.desc ? h("p", {}, feature.desc) : null

      if (feature?.link) {
        return h("a", { href: feature.link }, [title, desc]);
      }

      return [title, desc];
    }
  }
})
</script>

<style scoped>
a {
  color: rgba(60, 60, 67);
}

h3 {
  font-size: 16px default;
  margin: 0;
}

p {
  margin: 8px 0 12px;
  font-size: 16px;
}
</style>